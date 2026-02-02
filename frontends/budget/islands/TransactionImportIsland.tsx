import { useSignal } from "@preact/signals";
import { ErrorBoundary } from "../components/ErrorBoundary.tsx";
import { toast } from "./Toast.tsx";

interface ImportedTransaction {
  date: string;
  payee: string;
  memo: string;
  amount: number;
  isDuplicate: boolean;
  suggestedCategory?: string;
  rawData?: Record<string, string>;
}

interface ColumnMapping {
  date: string;
  payee: string;
  memo: string;
  amount: string;
}

interface Props {
  accountKey: string;
  reloadOnComplete?: boolean;
}

function TransactionImportContent(
  { accountKey, reloadOnComplete }: Props,
) {
  const isOpen = useSignal(false);
  const currentStep = useSignal<"upload" | "map" | "preview">("upload");
  const importFormat = useSignal<"csv" | "ofx" | null>(null);
  const rawFileContent = useSignal<string>("");
  const parsedData = useSignal<Record<string, string>[]>([]);
  const detectedHeaders = useSignal<string[]>([]);
  const columnMapping = useSignal<ColumnMapping>({
    date: "",
    payee: "",
    memo: "",
    amount: "",
  });
  const previewTransactions = useSignal<ImportedTransaction[]>([]);
  const selectedTransactions = useSignal<Set<number>>(new Set());
  const isImporting = useSignal(false);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })
      .format(amount);

  const openImportModal = () => {
    isOpen.value = true;
    currentStep.value = "upload";
    importFormat.value = null;
    rawFileContent.value = "";
    parsedData.value = [];
    detectedHeaders.value = [];
    previewTransactions.value = [];
    selectedTransactions.value = new Set();
  };

  const closeModal = () => {
    isOpen.value = false;
  };

  const handleFileUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      rawFileContent.value = content;

      // Detect format based on file extension and content
      if (
        file.name.toLowerCase().endsWith(".ofx") ||
        file.name.toLowerCase().endsWith(".qfx")
      ) {
        importFormat.value = "ofx";
        await parseOFX(content);
      } else if (file.name.toLowerCase().endsWith(".csv")) {
        importFormat.value = "csv";
        await parseCSV(content);
      } else {
        toast.error(
          "Unsupported format. Please upload CSV, OFX, or QFX files.",
        );
      }
    } catch (err) {
      console.error("File upload error:", err);
      toast.error(
        `Error reading file: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    }
  };

  const parseCSV = (content: string) => {
    try {
      // Use PapaParse pattern for parsing
      const lines = content.split("\n").filter((line) => line.trim());
      if (lines.length === 0) {
        throw new Error("Empty CSV file");
      }

      // Detect delimiter
      const firstLine = lines[0];
      const delimiters = [",", ";", "\t", "|"];
      let delimiter = ",";
      let maxCount = 0;

      for (const delim of delimiters) {
        const count = firstLine.split(delim).length;
        if (count > maxCount) {
          maxCount = count;
          delimiter = delim;
        }
      }

      // Parse headers
      const headers = lines[0].split(delimiter).map((h) =>
        h.trim().replace(/^["']|["']$/g, "")
      );
      detectedHeaders.value = headers;

      // Parse data rows
      const data: Record<string, string>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map((v) =>
          v.trim().replace(/^["']|["']$/g, "")
        );
        if (values.length === headers.length) {
          const row: Record<string, string> = {};
          headers.forEach((header, index) => {
            row[header] = values[index];
          });
          data.push(row);
        }
      }

      parsedData.value = data;

      // Auto-detect column mapping
      autoDetectColumns(headers);

      currentStep.value = "map";
    } catch (err) {
      console.error("CSV parse error:", err);
      toast.error(
        `Error parsing CSV: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    }
  };

  const parseOFX = (content: string) => {
    try {
      // Simple OFX parser for STMTTRN (statement transaction) tags
      const transactions: Record<string, string>[] = [];

      // Extract STMTTRN blocks
      const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
      let match;

      while ((match = stmtTrnRegex.exec(content)) !== null) {
        const trnBlock = match[1];
        const transaction: Record<string, string> = {};

        // Extract common OFX fields
        const fieldRegex = /<([A-Z]+)>(.*?)(?=<|$)/g;
        let fieldMatch;

        while ((fieldMatch = fieldRegex.exec(trnBlock)) !== null) {
          const fieldName = fieldMatch[1];
          const fieldValue = fieldMatch[2].trim();
          transaction[fieldName] = fieldValue;
        }

        if (Object.keys(transaction).length > 0) {
          transactions.push(transaction);
        }
      }

      if (transactions.length === 0) {
        throw new Error("No transactions found in OFX file");
      }

      parsedData.value = transactions;

      // OFX fields mapping
      detectedHeaders.value = Object.keys(transactions[0]);

      // Auto-map OFX standard fields
      columnMapping.value = {
        date: "DTPOSTED",
        payee: "NAME",
        memo: "MEMO",
        amount: "TRNAMT",
      };

      currentStep.value = "preview";
      generatePreview();
    } catch (err) {
      console.error("OFX parse error:", err);
      toast.error(
        `Error parsing OFX: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    }
  };

  const autoDetectColumns = (headers: string[]) => {
    const mapping: ColumnMapping = {
      date: "",
      payee: "",
      memo: "",
      amount: "",
    };

    const lowerHeaders = headers.map((h) => h.toLowerCase());

    // Detect date column
    const datePatterns = [
      "date",
      "transaction date",
      "posted date",
      "trans date",
    ];
    for (const pattern of datePatterns) {
      const index = lowerHeaders.findIndex((h) => h.includes(pattern));
      if (index !== -1) {
        mapping.date = headers[index];
        break;
      }
    }

    // Detect payee/merchant column
    const payeePatterns = ["payee", "merchant", "description", "name"];
    for (const pattern of payeePatterns) {
      const index = lowerHeaders.findIndex((h) => h.includes(pattern));
      if (index !== -1) {
        mapping.payee = headers[index];
        break;
      }
    }

    // Detect memo column
    const memoPatterns = ["memo", "note", "comment", "details"];
    for (const pattern of memoPatterns) {
      const index = lowerHeaders.findIndex((h) => h.includes(pattern));
      if (index !== -1) {
        mapping.memo = headers[index];
        break;
      }
    }

    // Detect amount column
    const amountPatterns = ["amount", "value", "total", "debit"];
    for (const pattern of amountPatterns) {
      const index = lowerHeaders.findIndex((h) => h.includes(pattern));
      if (index !== -1) {
        mapping.amount = headers[index];
        break;
      }
    }

    columnMapping.value = mapping;
  };

  const proceedToPreview = () => {
    if (
      !columnMapping.value.date || !columnMapping.value.payee ||
      !columnMapping.value.amount
    ) {
      toast.error("Please map at least Date, Payee, and Amount columns");
      return;
    }

    currentStep.value = "preview";
    generatePreview();
  };

  const generatePreview = () => {
    try {
      const transactions: ImportedTransaction[] = [];

      for (const row of parsedData.value) {
        const dateStr = importFormat.value === "ofx"
          ? row[columnMapping.value.date]
          : row[columnMapping.value.date];
        const payee = row[columnMapping.value.payee] || "Unknown";
        const memo = row[columnMapping.value.memo] || "";
        const amountStr = row[columnMapping.value.amount] || "0";

        // Parse date
        let date = "";
        if (importFormat.value === "ofx") {
          // OFX format: YYYYMMDDHHMMSS
          if (dateStr && dateStr.length >= 8) {
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            date = `${year}-${month}-${day}`;
          }
        } else {
          // CSV format: try to parse
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            date = parsed.toISOString().split("T")[0];
          }
        }

        // Parse amount
        const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, "")) || 0;

        transactions.push({
          date,
          payee,
          memo,
          amount,
          isDuplicate: false, // TODO: Check for duplicates
          suggestedCategory: undefined, // TODO: Smart categorization
          rawData: row,
        });
      }

      previewTransactions.value = transactions;

      // Select all by default
      selectedTransactions.value = new Set(
        transactions.map((_, index) => index),
      );
    } catch (err) {
      console.error("Preview generation error:", err);
      toast.error(
        `Error generating preview: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    }
  };

  const toggleTransaction = (index: number) => {
    const newSet = new Set(selectedTransactions.value);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    selectedTransactions.value = newSet;
  };

  const toggleAll = () => {
    if (selectedTransactions.value.size === previewTransactions.value.length) {
      selectedTransactions.value = new Set();
    } else {
      selectedTransactions.value = new Set(
        previewTransactions.value.map((_, index) => index),
      );
    }
  };

  const importTransactions = async () => {
    isImporting.value = true;

    try {
      const selected = previewTransactions.value.filter((_, index) =>
        selectedTransactions.value.has(index)
      );

      // Import each transaction
      for (const txn of selected) {
        const response = await fetch("/budget/api/v1/budget/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountKey,
            payee: txn.payee,
            memo: txn.memo,
            amount: txn.amount,
            transactionDate: txn.date,
            categoryKey: txn.suggestedCategory || null,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to import transaction: ${txn.payee}`);
        }
      }

      toast.success(`${selected.length} transactions imported successfully`);
      // Success
      closeModal();
      if (reloadOnComplete) {
        globalThis.location.reload();
      }
    } catch (err) {
      console.error("Import error:", err);
      toast.error(
        `Import failed: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
      );
    } finally {
      isImporting.value = false;
    }
  };

  return (
    <>
      <button
        type="button"
        class="btn bg-theme-tertiary border border-accent-cyan/50 hover:border-accent-cyan text-accent-cyan btn-sm min-h-[36px] font-mono"
        onClick={openImportModal}
      >
        📥 IMPORT
      </button>

      {isOpen.value && (
        <div class="modal modal-open">
          <div class="modal-box bg-theme-secondary border border-theme max-w-5xl shadow-2xl">
            <h3 class="font-bold text-xl mb-4 text-accent-cyan font-mono uppercase flex items-center gap-2">
              <span>📥</span>
              <span>TRANSACTION IMPORT</span>
            </h3>

            {/* Progress Steps */}
            <ul class="steps steps-horizontal w-full mb-8 font-mono text-[10px]">
              <li class="step step-primary uppercase">UPLOAD</li>
              <li
                class={`step uppercase ${
                  currentStep.value === "map" || currentStep.value === "preview"
                    ? "step-primary"
                    : ""
                }`}
              >
                MAP COLUMNS
              </li>
              <li
                class={`step uppercase ${
                  currentStep.value === "preview" ? "step-primary" : ""
                }`}
              >
                PREVIEW
              </li>
            </ul>

            {/* Step 1: Upload */}
            {currentStep.value === "upload" && (
              <div class="space-y-6">
                <div class="form-control">
                  <label class="label">
                    <span class="label-text font-mono text-xs text-theme-secondary">
                      SELECT DATA FILE (CSV, OFX, QFX)
                    </span>
                  </label>
                  <input
                    type="file"
                    accept=".csv,.ofx,.qfx"
                    class="file-input file-input-bordered w-full bg-theme-tertiary border-theme text-theme-secondary font-mono"
                    onChange={handleFileUpload}
                  />
                </div>

                {importFormat.value && (
                  <div class="alert bg-accent-cyan/10 border border-accent-cyan/30">
                    <span class="font-mono text-xs text-accent-cyan">
                      DETECTED FORMAT: {importFormat.value.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Map Columns (CSV only) */}
            {currentStep.value === "map" && (
              <div class="space-y-6">
                <p class="text-xs text-theme-secondary font-mono uppercase">
                  MAP SYSTEM FIELDS TO FILE COLUMNS:
                </p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-mono text-xs text-theme-secondary">
                        DATE FIELD *
                      </span>
                    </label>
                    <select
                      class="select select-bordered bg-theme-tertiary border-theme text-theme-primary font-mono text-xs"
                      value={columnMapping.value.date}
                      onChange={(e) =>
                        columnMapping.value = {
                          ...columnMapping.value,
                          date: e.currentTarget.value,
                        }}
                    >
                      <option value="">-- SELECT --</option>
                      {detectedHeaders.value.map((header) => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-mono text-xs text-theme-secondary">
                        PAYEE FIELD *
                      </span>
                    </label>
                    <select
                      class="select select-bordered bg-theme-tertiary border-theme text-theme-primary font-mono text-xs"
                      value={columnMapping.value.payee}
                      onChange={(e) =>
                        columnMapping.value = {
                          ...columnMapping.value,
                          payee: e.currentTarget.value,
                        }}
                    >
                      <option value="">-- SELECT --</option>
                      {detectedHeaders.value.map((header) => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-mono text-xs text-theme-secondary">
                        AMOUNT FIELD *
                      </span>
                    </label>
                    <select
                      class="select select-bordered bg-theme-tertiary border-theme text-theme-primary font-mono text-xs"
                      value={columnMapping.value.amount}
                      onChange={(e) =>
                        columnMapping.value = {
                          ...columnMapping.value,
                          amount: e.currentTarget.value,
                        }}
                    >
                      <option value="">-- SELECT --</option>
                      {detectedHeaders.value.map((header) => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>

                  <div class="form-control">
                    <label class="label">
                      <span class="label-text font-mono text-xs text-theme-secondary">
                        MEMO FIELD
                      </span>
                    </label>
                    <select
                      class="select select-bordered bg-theme-tertiary border-theme text-theme-primary font-mono text-xs"
                      value={columnMapping.value.memo}
                      onChange={(e) =>
                        columnMapping.value = {
                          ...columnMapping.value,
                          memo: e.currentTarget.value,
                        }}
                    >
                      <option value="">-- SELECT --</option>
                      {detectedHeaders.value.map((header) => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div class="modal-action">
                  <button
                    type="button"
                    class="btn font-mono"
                    onClick={() => currentStep.value = "upload"}
                  >
                    BACK
                  </button>
                  <button
                    type="button"
                    class="btn bg-accent-cyan/20 border-accent-cyan text-accent-cyan font-mono"
                    onClick={proceedToPreview}
                  >
                    NEXT: PREVIEW
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {currentStep.value === "preview" && (
              <div class="space-y-6">
                <div class="flex justify-between items-center bg-theme-tertiary p-3 border border-theme rounded">
                  <p class="text-xs text-theme-secondary font-mono uppercase">
                    {selectedTransactions.value.size} /{" "}
                    {previewTransactions.value.length} RECORDS SELECTED
                  </p>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs text-accent-cyan font-mono"
                    onClick={toggleAll}
                  >
                    {selectedTransactions.value.size ===
                        previewTransactions.value.length
                      ? "DESELECT ALL"
                      : "SELECT ALL"}
                  </button>
                </div>

                <div class="overflow-x-auto max-h-96 border border-theme">
                  <table class="table table-sm w-full">
                    <thead>
                      <tr class="bg-theme-tertiary border-b border-theme">
                        <th class="w-10">
                          <input
                            type="checkbox"
                            class="checkbox checkbox-xs checkbox-primary"
                            checked={selectedTransactions.value.size ===
                              previewTransactions.value.length}
                            onChange={toggleAll}
                          />
                        </th>
                        <th class="text-theme-secondary font-mono text-[10px]">DATE</th>
                        <th class="text-theme-secondary font-mono text-[10px]">PAYEE</th>
                        <th class="text-theme-secondary font-mono text-[10px]">MEMO</th>
                        <th class="text-right text-theme-secondary font-mono text-[10px]">
                          AMOUNT
                        </th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-theme">
                      {previewTransactions.value.map((txn, index) => (
                        <tr
                          key={index}
                          class={`hover:bg-theme-tertiary ${
                            selectedTransactions.value.has(index)
                              ? ""
                              : "opacity-40"
                          }`}
                        >
                          <td>
                            <input
                              type="checkbox"
                              class="checkbox checkbox-xs checkbox-primary"
                              checked={selectedTransactions.value.has(index)}
                              onChange={() => toggleTransaction(index)}
                            />
                          </td>
                          <td class="text-[10px] text-theme-primary font-mono">
                            {txn.date}
                          </td>
                          <td class="text-xs text-theme-primary font-bold">
                            {txn.payee.toUpperCase()}
                          </td>
                          <td class="text-[10px] text-theme-muted font-mono max-w-xs truncate">
                            {txn.memo}
                          </td>
                          <td
                            class={`text-right font-bold font-mono text-xs ${
                              txn.amount >= 0 ? "text-accent-green" : "text-theme-primary"
                            }`}
                          >
                            {formatCurrency(txn.amount)}
                          </td>
                          <td>
                            {txn.isDuplicate && (
                              <span class="badge badge-warning font-mono text-[8px] h-auto py-0 px-1">
                                DUPE?
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div class="modal-action">
                  <button
                    type="button"
                    class="btn font-mono"
                    onClick={() =>
                      currentStep.value = importFormat.value === "csv"
                        ? "map"
                        : "upload"}
                  >
                    BACK
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost font-mono"
                    onClick={closeModal}
                  >
                    CANCEL
                  </button>
                  <button
                    type="button"
                    class="btn bg-accent-green/20 border-accent-green text-accent-green font-mono"
                    onClick={importTransactions}
                    disabled={isImporting.value ||
                      selectedTransactions.value.size === 0}
                  >
                    {isImporting.value
                      ? <span class="loading loading-spinner loading-xs"></span>
                      : `IMPORT ${selectedTransactions.value.size} RECORDS`}
                  </button>
                </div>
              </div>
            )}

            {currentStep.value === "upload" && !importFormat.value && (
              <div class="modal-action">
                <button
                  type="button"
                  class="btn font-mono"
                  onClick={closeModal}
                >
                  CANCEL
                </button>
              </div>
            )}
          </div>
          <div class="modal-backdrop" onClick={closeModal}></div>
        </div>
      )}
    </>
  );
}

export default function TransactionImportIsland(props: Props) {
  return (
    <ErrorBoundary>
      <TransactionImportContent {...props} />
    </ErrorBoundary>
  );
}
