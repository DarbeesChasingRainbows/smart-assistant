import { useSignal } from "@preact/signals";
import { useRef } from "preact/hooks";
import { marked } from "marked";

interface Props {
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  rows?: number;
  entityId?: string;
  entityType?: string;
}

export default function MarkdownEditor(
  {
    value,
    onInput,
    placeholder,
    label,
    required,
    rows = 5,
    entityId,
    entityType,
  }: Props,
) {
  const previewMode = useSignal(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const uploading = useSignal(false);
  const recording = useSignal(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handlePaste = async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf("image") === 0) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await uploadFile(file, "image");
        }
      } else if (item.type.indexOf("audio") === 0) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await uploadFile(file, "audio");
        }
      }
    }
  };

  const uploadFile = async (file: File | Blob, type: "image" | "audio") => {
    if (uploading.value) return;
    uploading.value = true;

    try {
      const formData = new FormData();
      // If it's a blob (recording), give it a name
      if (file instanceof Blob && !(file instanceof File)) {
        formData.append(
          "file",
          file,
          `recording.${type === "audio" ? "webm" : "bin"}`,
        );
      } else {
        formData.append("file", file);
      }

      if (entityId) formData.append("entityId", entityId);
      if (entityType) formData.append("entityType", entityType);

      // Insert placeholder
      const placeholderText = `![Uploading ${type}...]`;
      insertText(placeholderText);

      const response = await fetch("/api/v1/files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      const data = await response.json();

      // Replace placeholder
      const currentValue = textareaRef.current?.value || "";
      let replacement = "";

      if (type === "image") {
        replacement = `![image](${data.url})`;
      } else {
        // For audio, use HTML audio tag as Markdown doesn't support it natively
        replacement = `<audio controls src="${data.url}"></audio>`;
      }

      const newValue = currentValue.replace(placeholderText, replacement);
      onInput(newValue);
    } catch (error) {
      console.error("Upload failed", error);
      alert(`Failed to upload ${type}`);
    } finally {
      uploading.value = false;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        await uploadFile(audioBlob, "audio");

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      recording.value = true;
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording.value) {
      mediaRecorderRef.current.stop();
      recording.value = false;
    }
  };

  const insertText = (text: string) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentValue = textareaRef.current.value;

    const newValue = currentValue.substring(0, start) + text +
      currentValue.substring(end);
    onInput(newValue);

    // Restore cursor position (after insertion)
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart =
          textareaRef.current.selectionEnd =
            start + text.length;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const format = (type: "bold" | "italic" | "link" | "image") => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentValue = textareaRef.current.value;
    const selectedText = currentValue.substring(start, end);

    let textToInsert = "";

    switch (type) {
      case "bold":
        textToInsert = `**${selectedText || "bold text"}**`;
        break;
      case "italic":
        textToInsert = `*${selectedText || "italic text"}*`;
        break;
      case "link":
        textToInsert = `[${selectedText || "link text"}](url)`;
        break;
      case "image":
        textToInsert = `![${selectedText || "alt text"}](url)`;
        break;
    }

    if (selectedText) {
      // If text selected, wrap it
      const newValue = currentValue.substring(0, start) + textToInsert +
        currentValue.substring(end);
      onInput(newValue);
    } else {
      // Insert template
      insertText(textToInsert);
    }
  };

  const renderMarkdown = (text: string) => {
    const html = marked.parse(text) as string;
    // Handle relative uploads for preview
    const processed = html.replace(
      /src=(["'])\/uploads\//g,
      "src=$1http://localhost:5137/uploads/",
    );
    return { __html: processed };
  };

  return (
    <div class="form-control w-full">
      {label && (
        <label class="label">
          <span class="label-text font-medium">{label}</span>
          <span class="label-text-alt text-gray-500">Markdown supported</span>
        </label>
      )}

      <div class="border border-base-300 rounded-lg overflow-hidden bg-white">
        {/* Toolbar */}
        <div class="flex items-center gap-1 p-2 bg-base-200 border-b border-base-300">
          <div class="flex gap-1 mr-4">
            <button
              type="button"
              onClick={() => format("bold")}
              class="btn btn-xs btn-ghost font-bold"
              title="Bold"
            >
              B
            </button>
            <button
              type="button"
              onClick={() => format("italic")}
              class="btn btn-xs btn-ghost italic"
              title="Italic"
            >
              I
            </button>
            <button
              type="button"
              onClick={() => format("link")}
              class="btn btn-xs btn-ghost"
              title="Link"
            >
              🔗
            </button>
            <button
              type="button"
              onClick={() => format("image")}
              class="btn btn-xs btn-ghost"
              title="Image"
            >
              🖼️
            </button>
            <button
              type="button"
              onClick={recording.value ? stopRecording : startRecording}
              class={`btn btn-xs ${
                recording.value ? "btn-error animate-pulse" : "btn-ghost"
              }`}
              title={recording.value ? "Stop Recording" : "Record Audio"}
            >
              {recording.value ? "⏹️" : "🎤"}
            </button>
          </div>

          <div class="flex-1"></div>

          <div class="tabs tabs-boxed tabs-xs bg-base-300">
            <a
              class={`tab ${!previewMode.value ? "tab-active" : ""}`}
              onClick={() => previewMode.value = false}
            >
              Write
            </a>
            <a
              class={`tab ${previewMode.value ? "tab-active" : ""}`}
              onClick={() => previewMode.value = true}
            >
              Preview
            </a>
          </div>
        </div>

        {/* Editor / Preview Area */}
        <div class="relative min-h-[150px]">
          {!previewMode.value
            ? (
              <textarea
                ref={textareaRef}
                value={value}
                onInput={(e) =>
                  onInput((e.target as HTMLTextAreaElement).value)}
                onPaste={handlePaste}
                class="textarea w-full h-full min-h-[150px] p-4 focus:outline-none focus:ring-0 border-none resize-y bg-transparent font-mono text-sm leading-relaxed"
                placeholder={placeholder}
                required={required}
                rows={rows}
              />
            )
            : (
              <div
                class="prose prose-sm p-4 min-h-[150px] w-full max-w-none overflow-y-auto"
                dangerouslySetInnerHTML={renderMarkdown(value)}
              />
            )}

          {uploading.value && (
            <div class="absolute inset-0 bg-white/50 flex items-center justify-center">
              <span class="loading loading-spinner loading-md text-primary">
              </span>
            </div>
          )}
        </div>
      </div>

      <label class="label">
        <span class="label-text-alt text-gray-400">
          {previewMode.value
            ? "Preview mode"
            : "Paste images directly to upload"}
        </span>
      </label>
    </div>
  );
}
