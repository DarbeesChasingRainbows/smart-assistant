namespace LifeOS.RulesEngine.Internal

open System
open System.Threading.Tasks
open LifeOS.RulesEngine.Contracts.Budget

/// Internal domain logic for budget calculations
module internal BudgetLogic =
    
    /// Calculate total assigned amount from assignments
    let calculateTotalAssigned (assignments: BudgetAssignmentDto array) =
        assignments |> Array.sumBy (fun a -> a.AssignedAmount)
    
    /// Calculate unassigned amount
    let calculateUnassigned totalIncome totalAssigned =
        totalIncome - totalAssigned
    
    /// Determine if budget is fully allocated (zero-based goal)
    let isFullyAllocated totalIncome totalAssigned =
        totalIncome - totalAssigned = 0m
    
    /// Calculate spent amount for a category from transactions
    let calculateSpentForCategory categoryKey (transactions: BudgetTransactionDto array) =
        transactions
        |> Array.filter (fun t -> t.CategoryKey = categoryKey && t.Amount < 0m)
        |> Array.sumBy (fun t -> Math.Abs(t.Amount))
    
    /// Calculate next due date for a bill based on frequency
    let calculateNextDueDate (bill: BudgetBillDto) (fromDate: DateTime) =
        let dueDay = bill.NextDueDate.Day
        let mutable nextDue = DateTime(fromDate.Year, fromDate.Month, Math.Min(dueDay, DateTime.DaysInMonth(fromDate.Year, fromDate.Month)))
        
        if nextDue < fromDate then
            nextDue <- nextDue.AddMonths(1)
            nextDue <- DateTime(nextDue.Year, nextDue.Month, Math.Min(dueDay, DateTime.DaysInMonth(nextDue.Year, nextDue.Month)))
        
        match bill.Frequency with
        | "Weekly" -> 
            let daysSinceLastDue = (fromDate - nextDue).Days % 7
            if daysSinceLastDue > 0 then nextDue.AddDays(float (7 - daysSinceLastDue))
            else nextDue
        | "BiWeekly" ->
            let daysSinceLastDue = (fromDate - nextDue).Days % 14
            if daysSinceLastDue > 0 then nextDue.AddDays(float (14 - daysSinceLastDue))
            else nextDue
        | "Quarterly" ->
            let quarterMonth = ((fromDate.Month - 1) / 3) * 3 + 1
            let quarterDate = DateTime(fromDate.Year, quarterMonth, Math.Min(dueDay, DateTime.DaysInMonth(fromDate.Year, quarterMonth)))
            if quarterDate < fromDate then quarterDate.AddMonths(3)
            else quarterDate
        | "Annually" ->
            let annualDate = DateTime(fromDate.Year, 1, Math.Min(dueDay, 31))
            if annualDate < fromDate then annualDate.AddYears(1)
            else annualDate
        | _ -> nextDue // Monthly or OneTime

/// F# Implementation of IBudgetRulesEngine
/// This is the "Black Box" - C# consumers only see the interface
[<Sealed>]
type BudgetRulesEngineImpl() =
    
    interface IBudgetRulesEngine with
        
        member _.CalculateBudgetSummaryAsync(payPeriodKey, totalIncome, assignments) =
            Task.FromResult(
                try
                    let totalAssigned = BudgetLogic.calculateTotalAssigned assignments
                    let unassigned = BudgetLogic.calculateUnassigned totalIncome totalAssigned
                    let isFullyAllocated = BudgetLogic.isFullyAllocated totalIncome totalAssigned
                    
                    BudgetResult.Success(
                        BudgetSummaryDto(
                            payPeriodKey,
                            totalIncome,
                            totalAssigned,
                            unassigned,
                            if totalIncome > 0m then totalAssigned / totalIncome * 100m else 0m
                        )
                    )
                with ex ->
                    BudgetResult<BudgetSummaryDto>.Failure("CALC_ERROR", ex.Message)
            )
        
        member _.CalculateCategoryBalancesAsync(categories, groups, assignments, transactions) =
            Task.FromResult(
                try
                    let assignmentLookup = 
                        assignments 
                        |> Array.map (fun a -> a.CategoryKey, a.AssignedAmount)
                        |> dict
                    
                    let groupLookup =
                        groups
                        |> Array.map (fun g -> g.Key, g.Name)
                        |> dict
                    
                    let balances =
                        categories
                        |> Array.map (fun cat ->
                            let assigned = 
                                match assignmentLookup.TryGetValue(cat.Key) with
                                | true, amount -> amount
                                | false, _ -> 0m
                            
                            let spent = BudgetLogic.calculateSpentForCategory cat.Key transactions
                            
                            let groupName =
                                match groupLookup.TryGetValue(cat.GroupKey) with
                                | true, name -> name
                                | false, _ -> "Uncategorized"
                            
                            CategoryBalanceDto(
                                cat.Key,
                                cat.Name,
                                assigned,
                                spent,
                                assigned - spent,
                                if assigned > 0m then (assigned - spent) / assigned * 100m else 0m
                            )
                        )
                    
                    BudgetResult.Success(balances)
                with ex ->
                    BudgetResult<CategoryBalanceDto array>.Failure("CALC_ERROR", ex.Message)
            )
        
        member _.ValidateAssignmentAsync(command, currentSummary) =
            Task.FromResult(
                try
                    // Check if assignment would cause over-assignment
                    let newUnassigned = currentSummary.Unassigned - command.AssignedAmount
                    
                    if newUnassigned < 0m then
                        BudgetResult<bool>.Failure(
                            "OVER_ASSIGNED",
                            sprintf "Cannot assign $%.2f. Only $%.2f available." command.AssignedAmount currentSummary.Unassigned
                        )
                    else
                        BudgetResult.Success(true)
                with ex ->
                    BudgetResult<bool>.Failure("VALIDATION_ERROR", ex.Message)
            )
        
        member _.CalculateUpcomingBillsAsync(bills, categories, accounts, fromDate, toDate) =
            Task.FromResult(
                try
                    let categoryLookup =
                        categories
                        |> Array.map (fun c -> c.Key, c.Name)
                        |> dict
                    
                    let accountLookup =
                        accounts
                        |> Array.map (fun a -> a.Key, a.Name)
                        |> dict
                    
                    let upcomingBills =
                        bills
                        |> Array.choose (fun bill ->
                            let nextDue = BudgetLogic.calculateNextDueDate bill fromDate
                            
                            if nextDue >= fromDate && nextDue <= toDate then
                                let categoryName =
                                    match categoryLookup.TryGetValue(bill.CategoryKey) with
                                    | true, name -> name
                                    | false, _ -> "Unknown"
                                
                                let accountName =
                                    match accountLookup.TryGetValue(bill.AccountKey) with
                                    | true, name -> name
                                    | false, _ -> "Unknown"
                                
                                Some(UpcomingBillDto(
                                    bill.Key,
                                    bill.Name,
                                    bill.Amount,
                                    nextDue,
                                    categoryName,
                                    accountName,
                                    bill.IsAutoPay
                                ))
                            else
                                None
                        )
                        |> Array.sortBy (fun b -> b.DueDate)
                    
                    BudgetResult.Success(upcomingBills)
                with ex ->
                    BudgetResult<UpcomingBillDto array>.Failure("CALC_ERROR", ex.Message)
            )
        
        member _.FindPayPeriodForDateAsync(payPeriods, targetDate) =
            Task.FromResult(
                try
                    let found =
                        payPeriods
                        |> Array.tryFind (fun pp -> 
                            targetDate >= pp.StartDate && targetDate <= pp.EndDate
                        )
                    
                    match found with
                    | Some pp -> BudgetResult.Success(pp)
                    | None -> 
                        BudgetResult<PayPeriodDto>.Failure(
                            "NOT_FOUND",
                            sprintf "No pay period found for date %s" (targetDate.ToString("yyyy-MM-dd"))
                        )
                with ex ->
                    BudgetResult<PayPeriodDto>.Failure("LOOKUP_ERROR", ex.Message)
            )
