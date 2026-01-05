namespace LifeOS.Domain.Finance

open System
open LifeOS.Domain.Common

/// Financial Account Aggregate Root
type Account = {
    Id: AccountId
    Name: string
    AccountType: AccountType
    Institution: string option
    AccountNumber: string option  // Last 4 digits only for security
    Currency: Currency
    OpeningBalance: Money
    CurrentBalance: Money
    IsActive: bool
    CreatedAt: DateTime
    UpdatedAt: DateTime
} with
    /// Apply a transaction amount to the account balance
    member this.ApplyAmount (amount: Money) =
        let newBalance = Money.add this.CurrentBalance amount
        Ok { this with 
            CurrentBalance = newBalance
            UpdatedAt = DateTime.utcNow()
        }
    
    /// Reverse a transaction amount (for corrections/voids)
    member this.ReverseAmount (amount: Money) =
        this.ApplyAmount (Money.negate amount)
    
    /// Deactivate the account
    member this.Deactivate () =
        if not this.IsActive then
            Error (BusinessRuleViolation "Account is already inactive")
        else
            Ok { this with 
                IsActive = false
                UpdatedAt = DateTime.utcNow()
            }
    
    /// Reactivate the account
    member this.Activate () =
        if this.IsActive then
            Error (BusinessRuleViolation "Account is already active")
        else
            Ok { this with 
                IsActive = true
                UpdatedAt = DateTime.utcNow()
            }
    
    /// Update account details
    member this.UpdateDetails name institution accountNumber =
        Ok { this with
            Name = name
            Institution = institution
            AccountNumber = accountNumber
            UpdatedAt = DateTime.utcNow()
        }

module Account =
    /// Create a new account
    let create name accountType institution accountNumber currency openingBalance =
        let now = DateTime.utcNow()
        Ok {
            Id = AccountId.create()
            Name = name
            AccountType = accountType
            Institution = institution
            AccountNumber = accountNumber
            Currency = currency
            OpeningBalance = openingBalance
            CurrentBalance = openingBalance
            IsActive = true
            CreatedAt = now
            UpdatedAt = now
        }
    
    /// Business rule: Check if account can accept transactions
    let canAcceptTransactions (account: Account) =
        if not account.IsActive then
            Error (BusinessRuleViolation "Cannot post transactions to inactive account")
        else
            Ok ()
    
    /// Business rule: Credit cards have inverted balance semantics
    let isDebtAccount (account: Account) =
        match account.AccountType with
        | CreditCard | Loan | Liability -> true
        | _ -> false
    
    /// Calculate available balance (for credit accounts, this is credit limit - balance)
    let availableBalance (account: Account) =
        account.CurrentBalance

/// Merchant entity
type Merchant = {
    Id: MerchantId
    Name: string
    DefaultCategoryId: CategoryId option
    Address: string option
    City: string option
    State: string option
    PostalCode: string option
    Phone: string option
    Website: string option
    Notes: string option
    CreatedAt: DateTime
    UpdatedAt: DateTime
}

module Merchant =
    let create name defaultCategoryId =
        let now = DateTime.utcNow()
        Ok {
            Id = MerchantId.create()
            Name = name
            DefaultCategoryId = defaultCategoryId
            Address = None
            City = None
            State = None
            PostalCode = None
            Phone = None
            Website = None
            Notes = None
            CreatedAt = now
            UpdatedAt = now
        }
    
    let updateDetails (merchant: Merchant) name website notes defaultCategoryId =
        Ok { merchant with
            Name = name
            Website = website
            Notes = notes
            DefaultCategoryId = defaultCategoryId
            UpdatedAt = DateTime.utcNow()
        }

/// Category entity for transaction classification
type Category = {
    Id: CategoryId
    Name: string
    CategoryType: CategoryType
    ParentId: CategoryId option
    Icon: string option
    Color: string option
    IsActive: bool
    CreatedAt: DateTime
    UpdatedAt: DateTime
}

module Category =
    let create name categoryType parentId =
        let now = DateTime.utcNow()
        Ok {
            Id = CategoryId.create()
            Name = name
            CategoryType = categoryType
            ParentId = parentId
            Icon = None
            Color = None
            IsActive = true
            CreatedAt = now
            UpdatedAt = now
        }
