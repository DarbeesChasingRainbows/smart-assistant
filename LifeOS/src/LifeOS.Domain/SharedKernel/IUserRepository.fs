namespace LifeOS.Domain.SharedKernel

open LifeOS.Domain.Common
open System
open System.Threading.Tasks

// IUserRepository - Port for User persistence (Shared Kernel)
type IUserRepository =
    
    // CRUD operations
    abstract member GetByIdAsync : UserId -> Task<User option>
    abstract member GetAllAsync : unit -> Task<User seq>
    abstract member AddAsync : User -> Task<User>
    abstract member UpdateAsync : User -> Task<User>
    abstract member DeleteAsync : UserId -> Task<bool>
    
    // Domain-specific queries
    abstract member GetByEmailAsync : Email -> Task<User option>
    abstract member GetByUsernameAsync : Username -> Task<User option>
    abstract member GetByRoleAsync : Role -> Task<User seq>
    abstract member GetActiveUsersAsync : unit -> Task<User seq>
    
    // Validation helpers
    abstract member IsEmailUniqueAsync : Email -> UserId option -> Task<bool>
    abstract member IsUsernameUniqueAsync : Username -> UserId option -> Task<bool>
    
    // Pagination support
    abstract member GetPagedAsync : int -> int -> Task<User seq * int>
    
    // Search functionality
    abstract member SearchAsync : string -> Task<User seq>

// Extension methods for user repository operations
[<RequireQualifiedAccess>]
module UserRepository =
    
    // Get users who can approve tasks
    let GetTaskApproversAsync (repository: IUserRepository) () =
        async {
            let! admins = repository.GetByRoleAsync Admin |> Async.AwaitTask
            let! parents = repository.GetByRoleAsync Parent |> Async.AwaitTask
            return Seq.append admins parents |> Seq.toList
        }
    
    // Get family members (excluding guests)
    let GetFamilyMembersAsync (repository: IUserRepository) () =
        async {
            let! admins = repository.GetByRoleAsync Admin |> Async.AwaitTask
            let! parents = repository.GetByRoleAsync Parent |> Async.AwaitTask
            let! children = repository.GetByRoleAsync Child |> Async.AwaitTask
            return Seq.append (Seq.append admins parents) children |> Seq.toList
        }
