namespace LifeOS.Domain.Finance

open System
open System.Threading.Tasks

/// Repository interface for Account aggregate
type IAccountRepository =
    abstract member GetById: AccountId -> Task<Account option>
    abstract member GetAll: unit -> Task<Account list>
    abstract member GetActive: unit -> Task<Account list>
    abstract member Save: Account -> Task<Account>
    abstract member UpdateBalance: AccountId -> Money -> Task<unit>

/// Repository interface for Merchant entity
type IMerchantRepository =
    abstract member GetById: MerchantId -> Task<Merchant option>
    abstract member GetAll: unit -> Task<Merchant list>
    abstract member Search: string -> Task<Merchant list>
    abstract member Save: Merchant -> Task<Merchant>
    abstract member Delete: MerchantId -> Task<unit>

/// Repository interface for Category entity
type ICategoryRepository =
    abstract member GetById: CategoryId -> Task<Category option>
    abstract member GetAll: unit -> Task<Category list>
    abstract member GetByType: CategoryType -> Task<Category list>
    abstract member Save: Category -> Task<Category>

/// Repository interface for Transaction aggregate
type ITransactionRepository =
    abstract member GetById: TransactionId -> Task<Transaction option>
    abstract member GetByAccount: AccountId -> Task<Transaction list>
    abstract member GetByCategory: CategoryId -> Task<Transaction list>
    abstract member GetByDateRange: DateTime -> DateTime -> Task<Transaction list>
    abstract member GetByCategoryAndDateRange: CategoryId -> DateTime -> DateTime -> Task<Transaction list>
    abstract member Query: accountKey: string option -> categoryKey: string option -> startDate: DateTime option -> endDate: DateTime option -> status: string option -> limit: int -> offset: int -> Task<Transaction list>
    abstract member Save: Transaction -> Task<Transaction>
    abstract member SaveMany: Transaction list -> Task<unit>

/// Repository interface for JournalEntry
type IJournalEntryRepository =
    abstract member GetByTransaction: TransactionId -> Task<JournalEntry list>
    abstract member Save: JournalEntry -> Task<JournalEntry>
    abstract member SaveMany: JournalEntry list -> Task<unit>

/// Repository interface for Receipt entity
type IReceiptRepository =
    abstract member GetById: ReceiptId -> Task<Receipt option>
    abstract member GetByTransaction: TransactionId -> Task<Receipt list>
    abstract member GetAll: int -> Task<Receipt list>
    abstract member Save: Receipt -> Task<Receipt>

/// Repository interface for Budget aggregate
type IBudgetRepository =
    abstract member GetById: BudgetId -> Task<Budget option>
    abstract member GetByPeriod: BudgetPeriod -> Task<Budget list>
    abstract member GetByCategoryAndPeriod: CategoryId -> BudgetPeriod -> Task<Budget option>
    abstract member GetByPeriodKey: string -> Task<Budget list>
    abstract member Save: Budget -> Task<Budget>
    abstract member SaveMany: Budget list -> Task<unit>

/// Repository interface for Reconciliation aggregate
type IReconciliationRepository =
    abstract member GetById: ReconciliationId -> Task<Reconciliation option>
    abstract member GetByAccount: AccountId -> Task<Reconciliation list>
    abstract member GetInProgress: AccountId -> Task<Reconciliation option>
    abstract member Save: Reconciliation -> Task<Reconciliation>

/// Repository interface for PayPeriodConfig
type IPayPeriodConfigRepository =
    abstract member Get: unit -> Task<PayPeriodConfig option>
    abstract member Save: PayPeriodConfig -> Task<PayPeriodConfig>

/// Unit of Work for transactional operations
type IFinanceUnitOfWork =
    abstract member Accounts: IAccountRepository
    abstract member Merchants: IMerchantRepository
    abstract member Categories: ICategoryRepository
    abstract member Transactions: ITransactionRepository
    abstract member JournalEntries: IJournalEntryRepository
    abstract member Receipts: IReceiptRepository
    abstract member Budgets: IBudgetRepository
    abstract member Reconciliations: IReconciliationRepository
    abstract member PayPeriodConfig: IPayPeriodConfigRepository
    abstract member CommitAsync: unit -> Task<unit>
