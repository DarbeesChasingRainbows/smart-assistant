using LifeOS.API.DTOs;
using LifeOS.Domain.Common;
using LifeOS.Domain.SharedKernel;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;
using Microsoft.FSharp.Core;
using Microsoft.AspNetCore.Mvc;

namespace LifeOS.API.Endpoints;

public static class PeopleEndpoints
{
    private const string UsersCollection = ArangoDbContext.Collections.Users;
    private const string PeopleEmploymentsCollection = ArangoDbContext.Collections.PeopleEmployments;
    private const string PeopleRelationshipsCollection = ArangoDbContext.Collections.PeopleRelationships;

    public static void MapPeopleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/people")
            .WithTags("People");

        group.MapGet("/", GetAll)
            .WithName("GetAllPeople")
            .WithDescription("Get all people");

        group.MapGet("/{id:guid}", GetById)
            .WithName("GetPersonById")
            .WithDescription("Get a person by ID");

        group.MapGet("/active", GetActive)
            .WithName("GetActivePeople")
            .WithDescription("Get all active people");

        group.MapPost("/", Create)
            .WithName("CreatePerson")
            .WithDescription("Create a new person");

        group.MapPut("/{id:guid}", Update)
            .WithName("UpdatePerson")
            .WithDescription("Update a person's role and/or active status");

        group.MapDelete("/{id:guid}", Delete)
            .WithName("DeletePerson")
            .WithDescription("Delete a person");

        group.MapGet("/search", Search)
            .WithName("SearchPeople")
            .WithDescription("Search people by term");

        group.MapGet("/paged", GetPaged)
            .WithName("GetPeoplePaged")
            .WithDescription("Get people with pagination");

        group.MapGet("/{id:guid}/relationships", GetRelationships)
            .WithName("GetPersonRelationships")
            .WithDescription("Get genealogy relationships for a person");

        group.MapPost("/{id:guid}/relationships", CreateRelationship)
            .WithName("CreatePersonRelationship")
            .WithDescription("Create a genealogy relationship (edge) between two people");

        group.MapPost("/relationships/{edgeKey}/invalidate", InvalidateRelationship)
            .WithName("InvalidatePersonRelationship")
            .WithDescription("Invalidate a relationship edge without deleting history");

        group.MapGet("/{id:guid}/employment", GetEmployment)
            .WithName("GetPersonEmployment")
            .WithDescription("Get employment records for a person");

        group.MapPost("/{id:guid}/employment", CreateEmployment)
            .WithName("CreatePersonEmployment")
            .WithDescription("Create an employment record for a person");

        group.MapPut("/employment/{employmentKey}", UpdateEmployment)
            .WithName("UpdatePersonEmployment")
            .WithDescription("Update an employment record");

        group.MapDelete("/employment/{employmentKey}", DeleteEmployment)
            .WithName("DeletePersonEmployment")
            .WithDescription("Delete an employment record");

        group.MapGet("/employers", GetEmployers)
            .WithName("GetEmployers")
            .WithDescription("List distinct employers (for dropdowns)");
    }

    private static async Task<IResult> GetAll([FromServices] IUserRepository repository)
    {
        var people = await repository.GetAllAsync();
        return Results.Ok(people.Select(MapToDto));
    }

    private static async Task<IResult> GetById(Guid id, [FromServices] IUserRepository repository)
    {
        var userId = Id.createUserIdFrom(id);
        var userOpt = await repository.GetByIdAsync(userId);

        if (FSharpOption<User>.get_IsNone(userOpt))
            return Results.NotFound(new ApiErrorResponse { Error = "Person not found" });

        return Results.Ok(MapToDto(userOpt.Value!));
    }

    private static async Task<IResult> GetActive([FromServices] IUserRepository repository)
    {
        var people = await repository.GetActiveUsersAsync();
        return Results.Ok(people.Select(MapToDto));
    }

    private static async Task<IResult> Create(CreatePersonRequest request, [FromServices] IUserRepository repository)
    {
        var emailResult = SharedKernelInterop.CreateEmail(request.Email);
        if (emailResult.IsError)
            return Results.BadRequest(new ApiErrorResponse { Error = "Invalid email" });

        var usernameResult = SharedKernelInterop.CreateUsername(request.Username);
        if (usernameResult.IsError)
            return Results.BadRequest(new ApiErrorResponse { Error = "Invalid username" });

        var roleResult = SharedKernelInterop.ParseRole(request.Role);
        if (roleResult.IsError)
            return Results.BadRequest(new ApiErrorResponse { Error = "Invalid role" });

        var emailUnique = await repository.IsEmailUniqueAsync(emailResult.ResultValue, FSharpOption<UserId>.None);
        if (!emailUnique)
            return Results.Conflict(new ApiErrorResponse { Error = "Email already exists" });

        var usernameUnique = await repository.IsUsernameUniqueAsync(usernameResult.ResultValue, FSharpOption<UserId>.None);
        if (!usernameUnique)
            return Results.Conflict(new ApiErrorResponse { Error = "Username already exists" });

        var userResult = SharedKernelInterop.CreateUser(request.Email, request.Username, roleResult.ResultValue);
        if (userResult.IsError)
            return Results.BadRequest(new ApiErrorResponse { Error = "Failed to create person" });

        var created = await repository.AddAsync(userResult.ResultValue);
        return Results.Ok(MapToDto(created));
    }

    private static async Task<IResult> Update(Guid id, UpdatePersonRequest request, [FromServices] IUserRepository repository)
    {
        var userId = Id.createUserIdFrom(id);
        var userOpt = await repository.GetByIdAsync(userId);

        if (FSharpOption<User>.get_IsNone(userOpt))
            return Results.NotFound(new ApiErrorResponse { Error = "Person not found" });

        var user = userOpt.Value!;

        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            var roleResult = SharedKernelInterop.ParseRole(request.Role);
            if (roleResult.IsError)
                return Results.BadRequest(new ApiErrorResponse { Error = "Invalid role" });

            var updateRoleResult = SharedKernelInterop.UpdateUserRole(user, roleResult.ResultValue);
            if (updateRoleResult.IsOk)
                user = updateRoleResult.ResultValue;
            else
                return Results.BadRequest(new ApiErrorResponse { Error = "Update failed" });
        }

        if (request.IsActive.HasValue)
        {
            var updateActiveResult = request.IsActive.Value
                ? SharedKernelInterop.ActivateUser(user)
                : SharedKernelInterop.DeactivateUser(user);

            if (updateActiveResult.IsOk)
                user = updateActiveResult.ResultValue;
            else
                return Results.BadRequest(new ApiErrorResponse { Error = "Update failed" });
        }

        var updated = await repository.UpdateAsync(user);
        return Results.Ok(MapToDto(updated));
    }

    private static async Task<IResult> Delete(Guid id, [FromServices] IUserRepository repository)
    {
        var userId = Id.createUserIdFrom(id);
        var success = await repository.DeleteAsync(userId);

        return success
            ? Results.NoContent()
            : Results.NotFound(new ApiErrorResponse { Error = "Person not found" });
    }

    private static async Task<IResult> Search(string term, [FromServices] IUserRepository repository)
    {
        var results = await repository.SearchAsync(term);
        return Results.Ok(results.Select(MapToDto));
    }

    private static async Task<IResult> GetPaged(int page, int pageSize, [FromServices] IUserRepository repository)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var (people, total) = await repository.GetPagedAsync(page, pageSize);

        return Results.Ok(new PersonListResponse
        {
            People = people.Select(MapToDto),
            TotalCount = total,
            Page = page,
            PageSize = pageSize
        });
    }

    private static PersonDto MapToDto(User user)
    {
        return new PersonDto
        {
            Id = Id.userIdValue(user.Id),
            Email = SharedKernelInterop.GetEmailValue(user.Email),
            Username = SharedKernelInterop.GetUsernameValue(user.Username),
            Role = SharedKernelInterop.RoleToString(user.Role),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    private static async Task<IResult> GetRelationships(Guid id, [FromServices] ArangoDbContext db)
    {
        var personKey = id.ToString();
        var query = $@"
FOR e IN {PeopleRelationshipsCollection}
    FILTER e._from == @from
    SORT e.createdAt DESC
    RETURN e";

        var bindVars = new Dictionary<string, object> { { "from", $"{UsersCollection}/{personKey}" } };
        var cursor = await db.Client.Cursor.PostCursorAsync<PeopleRelationshipEdge>(query, bindVars);

        return Results.Ok(cursor.Result.Select(MapRelationship));
    }

    private static async Task<IResult> CreateRelationship(Guid id, CreatePeopleRelationshipRequest request, [FromServices] ArangoDbContext db)
    {
        if (request.ToPersonId == Guid.Empty)
            return Results.BadRequest(new ApiErrorResponse { Error = "ToPersonId is required" });

        if (string.IsNullOrWhiteSpace(request.Type))
            return Results.BadRequest(new ApiErrorResponse { Error = "Type is required" });

        var fromKey = id.ToString();
        var toKey = request.ToPersonId.ToString();

        // validate both people exist
        if (!await UserExists(db, fromKey) || !await UserExists(db, toKey))
            return Results.NotFound(new ApiErrorResponse { Error = "One or both people not found" });

        var edge = new PeopleRelationshipEdge
        {
            From = $"{UsersCollection}/{fromKey}",
            To = $"{UsersCollection}/{toKey}",
            Type = request.Type.Trim(),
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes,
            IsValid = true,
            InvalidatedAt = null,
            InvalidatedReason = null,
            CreatedAt = global::System.DateTime.UtcNow,
        };

        await db.Client.Document.PostDocumentAsync(PeopleRelationshipsCollection, edge);

        return Results.Created($"/api/v1/people/{id}/relationships", MapRelationship(edge));
    }

    private static async Task<IResult> InvalidateRelationship(string edgeKey, InvalidatePeopleRelationshipRequest request, [FromServices] ArangoDbContext db)
    {
        if (string.IsNullOrWhiteSpace(edgeKey))
            return Results.BadRequest(new ApiErrorResponse { Error = "edgeKey is required" });
        if (string.IsNullOrWhiteSpace(request.Reason))
            return Results.BadRequest(new ApiErrorResponse { Error = "Reason is required" });

        var query = $@"
FOR e IN {PeopleRelationshipsCollection}
    FILTER e._key == @key
    UPDATE e WITH {{ isValid: false, invalidatedAt: @invalidatedAt, invalidatedReason: @reason }} IN {PeopleRelationshipsCollection}
    RETURN NEW";

        var bindVars = new Dictionary<string, object>
        {
            { "key", edgeKey },
            { "invalidatedAt", global::System.DateTime.UtcNow },
            { "reason", request.Reason },
        };

        var cursor = await db.Client.Cursor.PostCursorAsync<PeopleRelationshipEdge>(query, bindVars);
        var updated = cursor.Result.FirstOrDefault();
        return updated == null ? Results.NotFound(new ApiErrorResponse { Error = "Relationship edge not found" }) : Results.Ok(MapRelationship(updated));
    }

    private static async Task<IResult> GetEmployment(Guid id, [FromServices] ArangoDbContext db)
    {
        var personKey = id.ToString();
        var query = $@"
FOR e IN {PeopleEmploymentsCollection}
    FILTER e.personId == @personId
    SORT e.isCurrent DESC, e.startDate DESC
    RETURN e";

        var bindVars = new Dictionary<string, object> { { "personId", personKey } };
        var cursor = await db.Client.Cursor.PostCursorAsync<PeopleEmploymentDocument>(query, bindVars);
        return Results.Ok(cursor.Result.Select(MapEmployment));
    }

    private static async Task<IResult> CreateEmployment(Guid id, CreatePeopleEmploymentRequest request, [FromServices] ArangoDbContext db)
    {
        var personKey = id.ToString();
        if (!await UserExists(db, personKey))
            return Results.NotFound(new ApiErrorResponse { Error = "Person not found" });

        if (string.IsNullOrWhiteSpace(request.Employer))
            return Results.BadRequest(new ApiErrorResponse { Error = "Employer is required" });

        if (request.StartDate == default)
            return Results.BadRequest(new ApiErrorResponse { Error = "StartDate is required" });

        var doc = new PeopleEmploymentDocument
        {
            Key = Guid.NewGuid().ToString("N"),
            PersonId = personKey,
            Employer = request.Employer.Trim(),
            Title = string.IsNullOrWhiteSpace(request.Title) ? null : request.Title,
            EmploymentType = string.IsNullOrWhiteSpace(request.EmploymentType) ? null : request.EmploymentType,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            IsCurrent = request.IsCurrent,
            Location = string.IsNullOrWhiteSpace(request.Location) ? null : request.Location,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes,
            CreatedAt = global::System.DateTime.UtcNow,
            UpdatedAt = global::System.DateTime.UtcNow,
        };

        await db.Client.Document.PostDocumentAsync(PeopleEmploymentsCollection, doc);
        return Results.Created($"/api/v1/people/{id}/employment", MapEmployment(doc));
    }

    private static async Task<IResult> UpdateEmployment(string employmentKey, UpdatePeopleEmploymentRequest request, [FromServices] ArangoDbContext db)
    {
        if (string.IsNullOrWhiteSpace(employmentKey))
            return Results.BadRequest(new ApiErrorResponse { Error = "employmentKey is required" });

        var existing = await GetEmploymentByKey(db, employmentKey);
        if (existing == null)
            return Results.NotFound(new ApiErrorResponse { Error = "Employment record not found" });

        var updated = new PeopleEmploymentDocument
        {
            Key = existing.Key,
            Id = existing.Id,
            Rev = existing.Rev,
            PersonId = existing.PersonId,
            Employer = string.IsNullOrWhiteSpace(request.Employer) ? existing.Employer : request.Employer.Trim(),
            Title = request.Title ?? existing.Title,
            EmploymentType = request.EmploymentType ?? existing.EmploymentType,
            StartDate = request.StartDate ?? existing.StartDate,
            EndDate = request.EndDate ?? existing.EndDate,
            IsCurrent = request.IsCurrent ?? existing.IsCurrent,
            Location = request.Location ?? existing.Location,
            Notes = request.Notes ?? existing.Notes,
            CreatedAt = existing.CreatedAt,
            UpdatedAt = global::System.DateTime.UtcNow,
        };

        await db.Client.Document.PutDocumentAsync(PeopleEmploymentsCollection, existing.Key, updated);
        return Results.Ok(MapEmployment(updated));
    }

    private static async Task<IResult> DeleteEmployment(string employmentKey, [FromServices] ArangoDbContext db)
    {
        if (string.IsNullOrWhiteSpace(employmentKey))
            return Results.BadRequest(new ApiErrorResponse { Error = "employmentKey is required" });

        var existing = await GetEmploymentByKey(db, employmentKey);
        if (existing == null)
            return Results.NotFound(new ApiErrorResponse { Error = "Employment record not found" });

        await db.Client.Document.DeleteDocumentAsync(PeopleEmploymentsCollection, existing.Key);
        return Results.NoContent();
    }

    private static async Task<IResult> GetEmployers([FromServices] ArangoDbContext db)
    {
        var query = $@"
FOR e IN {PeopleEmploymentsCollection}
    COLLECT employer = e.employer
    SORT employer ASC
    RETURN employer";

        var cursor = await db.Client.Cursor.PostCursorAsync<string>(query);
        return Results.Ok(cursor.Result);
    }

    private static PeopleRelationshipDto MapRelationship(PeopleRelationshipEdge edge)
    {
        return new PeopleRelationshipDto
        {
            Key = edge.Key ?? string.Empty,
            FromPersonId = Guid.Parse(edge.From.Split('/').Last()),
            ToPersonId = Guid.Parse(edge.To.Split('/').Last()),
            Type = edge.Type,
            StartDate = edge.StartDate,
            EndDate = edge.EndDate,
            Notes = edge.Notes,
            IsValid = edge.IsValid,
            InvalidatedAt = edge.InvalidatedAt,
            InvalidatedReason = edge.InvalidatedReason,
            CreatedAt = edge.CreatedAt,
        };
    }

    private static PeopleEmploymentDto MapEmployment(PeopleEmploymentDocument doc)
    {
        return new PeopleEmploymentDto
        {
            Key = doc.Key,
            PersonId = Guid.Parse(doc.PersonId),
            Employer = doc.Employer,
            Title = doc.Title,
            EmploymentType = doc.EmploymentType,
            StartDate = doc.StartDate,
            EndDate = doc.EndDate,
            IsCurrent = doc.IsCurrent,
            Location = doc.Location,
            Notes = doc.Notes,
            CreatedAt = doc.CreatedAt,
            UpdatedAt = doc.UpdatedAt,
        };
    }

    private static async Task<bool> UserExists([FromServices] ArangoDbContext db, string userKey)
    {
        var query = $"FOR u IN {UsersCollection} FILTER u.Key == @key LIMIT 1 RETURN 1";
        var bindVars = new Dictionary<string, object> { { "key", userKey } };
        var cursor = await db.Client.Cursor.PostCursorAsync<int>(query, bindVars);
        return cursor.Result.FirstOrDefault() == 1;
    }

    private static async Task<PeopleEmploymentDocument?> GetEmploymentByKey([FromServices] ArangoDbContext db, string key)
    {
        var query = $"FOR e IN {PeopleEmploymentsCollection} FILTER e._key == @key RETURN e";
        var bindVars = new Dictionary<string, object> { { "key", key } };
        var cursor = await db.Client.Cursor.PostCursorAsync<PeopleEmploymentDocument>(query, bindVars);
        return cursor.Result.FirstOrDefault();
    }
}
