using ArangoDBNetStandard.CursorApi.Models;
using LifeOS.Domain.Common;
using LifeOS.Domain.SharedKernel;
using LifeOS.Infrastructure.Persistence.ArangoDB;
using LifeOS.Infrastructure.Persistence.Documents;

namespace LifeOS.Infrastructure.SharedKernel;

public class UserRepository : IUserRepository
{
    private readonly ArangoDbContext _context;
    private const string CollectionName = ArangoDbContext.Collections.Users;

    public UserRepository(ArangoDbContext context)
    {
        _context = context;
    }

    public async Task<Microsoft.FSharp.Core.FSharpOption<User>> GetByIdAsync(UserId userId)
    {
        var id = Id.userIdValue(userId).ToString();
        var query = $"FOR u IN {CollectionName} FILTER u.Key == @id RETURN u";
        var bindVars = new Dictionary<string, object> { { "id", id } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<UserDocument>(query, bindVars);
        var doc = cursor.Result.FirstOrDefault();
        var user = UserMapper.ToDomain(doc);

        return user != null
            ? Microsoft.FSharp.Core.FSharpOption<User>.Some(user)
            : Microsoft.FSharp.Core.FSharpOption<User>.None;
    }

    public async Task<IEnumerable<User>> GetAllAsync()
    {
        var query = $"FOR u IN {CollectionName} RETURN u";
        var cursor = await _context.Client.Cursor.PostCursorAsync<UserDocument>(query);

        var users = new List<User>();
        foreach (var doc in cursor.Result)
        {
            var user = UserMapper.ToDomain(doc);
            if (user != null) users.Add(user);
        }
        return users;
    }

    public async Task<User> AddAsync(User user)
    {
        var document = UserMapper.ToDocument(user);
        await _context.Client.Document.PostDocumentAsync(CollectionName, document);
        return user;
    }

    public async Task<User> UpdateAsync(User user)
    {
        var document = UserMapper.ToDocument(user);
        var domainId = Id.userIdValue(user.Id).ToString();

        var keyQuery = $"FOR u IN {CollectionName} FILTER u.Key == @id RETURN u._key";
        var keyBindVars = new Dictionary<string, object> { { "id", domainId } };
        var keyCursor = await _context.Client.Cursor.PostCursorAsync<string>(keyQuery, keyBindVars);
        var arangoKey = keyCursor.Result.FirstOrDefault();

        if (string.IsNullOrWhiteSpace(arangoKey))
            throw new InvalidOperationException("User not found");

        await _context.Client.Document.PutDocumentAsync(CollectionName, arangoKey, document);
        return user;
    }

    public async Task<bool> DeleteAsync(UserId userId)
    {
        try
        {
            var domainId = Id.userIdValue(userId).ToString();

            var keyQuery = $"FOR u IN {CollectionName} FILTER u.Key == @id RETURN u._key";
            var keyBindVars = new Dictionary<string, object> { { "id", domainId } };
            var keyCursor = await _context.Client.Cursor.PostCursorAsync<string>(keyQuery, keyBindVars);
            var arangoKey = keyCursor.Result.FirstOrDefault();

            if (string.IsNullOrWhiteSpace(arangoKey))
                return false;

            await _context.Client.Document.DeleteDocumentAsync(CollectionName, arangoKey);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public async Task<Microsoft.FSharp.Core.FSharpOption<User>> GetByEmailAsync(Email email)
    {
        var emailValue = SharedKernelInterop.GetEmailValue(email);
        var query = $"FOR u IN {CollectionName} FILTER u.Email == @email RETURN u";
        var bindVars = new Dictionary<string, object> { { "email", emailValue } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<UserDocument>(query, bindVars);
        var doc = cursor.Result.FirstOrDefault();
        var user = UserMapper.ToDomain(doc);

        return user != null
            ? Microsoft.FSharp.Core.FSharpOption<User>.Some(user)
            : Microsoft.FSharp.Core.FSharpOption<User>.None;
    }

    public async Task<Microsoft.FSharp.Core.FSharpOption<User>> GetByUsernameAsync(Username username)
    {
        var usernameValue = SharedKernelInterop.GetUsernameValue(username);
        var query = $"FOR u IN {CollectionName} FILTER u.Username == @username RETURN u";
        var bindVars = new Dictionary<string, object> { { "username", usernameValue } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<UserDocument>(query, bindVars);
        var doc = cursor.Result.FirstOrDefault();
        var user = UserMapper.ToDomain(doc);

        return user != null
            ? Microsoft.FSharp.Core.FSharpOption<User>.Some(user)
            : Microsoft.FSharp.Core.FSharpOption<User>.None;
    }

    public async Task<IEnumerable<User>> GetByRoleAsync(Role role)
    {
        var roleValue = SharedKernelInterop.RoleToString(role);
        var query = $"FOR u IN {CollectionName} FILTER u.Role == @role RETURN u";
        var bindVars = new Dictionary<string, object> { { "role", roleValue } };

        var cursor = await _context.Client.Cursor.PostCursorAsync<UserDocument>(query, bindVars);

        var users = new List<User>();
        foreach (var doc in cursor.Result)
        {
            var user = UserMapper.ToDomain(doc);
            if (user != null) users.Add(user);
        }
        return users;
    }

    public async Task<IEnumerable<User>> GetActiveUsersAsync()
    {
        var query = $"FOR u IN {CollectionName} FILTER u.IsActive == true RETURN u";
        var cursor = await _context.Client.Cursor.PostCursorAsync<UserDocument>(query);

        var users = new List<User>();
        foreach (var doc in cursor.Result)
        {
            var user = UserMapper.ToDomain(doc);
            if (user != null) users.Add(user);
        }
        return users;
    }

    public async Task<bool> IsEmailUniqueAsync(Email email, Microsoft.FSharp.Core.FSharpOption<UserId> excludeUserId)
    {
        var emailValue = SharedKernelInterop.GetEmailValue(email);
        string query;
        Dictionary<string, object> bindVars;

        if (Microsoft.FSharp.Core.FSharpOption<UserId>.get_IsSome(excludeUserId))
        {
            var excludeKey = Id.userIdValue(excludeUserId.Value).ToString();
            query = $"FOR u IN {CollectionName} FILTER u.Email == @email AND u.Key != @excludeKey RETURN u";
            bindVars = new Dictionary<string, object>
            {
                { "email", emailValue },
                { "excludeKey", excludeKey }
            };
        }
        else
        {
            query = $"FOR u IN {CollectionName} FILTER u.Email == @email RETURN u";
            bindVars = new Dictionary<string, object> { { "email", emailValue } };
        }

        var cursor = await _context.Client.Cursor.PostCursorAsync<UserDocument>(query, bindVars);
        return !cursor.Result.Any();
    }

    public async Task<bool> IsUsernameUniqueAsync(Username username, Microsoft.FSharp.Core.FSharpOption<UserId> excludeUserId)
    {
        var usernameValue = SharedKernelInterop.GetUsernameValue(username);
        string query;
        Dictionary<string, object> bindVars;

        if (Microsoft.FSharp.Core.FSharpOption<UserId>.get_IsSome(excludeUserId))
        {
            var excludeKey = Id.userIdValue(excludeUserId.Value).ToString();
            query = $"FOR u IN {CollectionName} FILTER u.Username == @username AND u.Key != @excludeKey RETURN u";
            bindVars = new Dictionary<string, object>
            {
                { "username", usernameValue },
                { "excludeKey", excludeKey }
            };
        }
        else
        {
            query = $"FOR u IN {CollectionName} FILTER u.Username == @username RETURN u";
            bindVars = new Dictionary<string, object> { { "username", usernameValue } };
        }

        var cursor = await _context.Client.Cursor.PostCursorAsync<UserDocument>(query, bindVars);
        return !cursor.Result.Any();
    }

    public async Task<Tuple<IEnumerable<User>, int>> GetPagedAsync(int page, int pageSize)
    {
        var offset = (page - 1) * pageSize;

        var countQuery = $"RETURN LENGTH({CollectionName})";
        var countCursor = await _context.Client.Cursor.PostCursorAsync<int>(countQuery);
        var totalCount = countCursor.Result.FirstOrDefault();

        var query = $"FOR u IN {CollectionName} LIMIT @offset, @limit RETURN u";
        var bindVars = new Dictionary<string, object>
        {
            { "offset", offset },
            { "limit", pageSize }
        };

        var cursor = await _context.Client.Cursor.PostCursorAsync<UserDocument>(query, bindVars);

        var users = new List<User>();
        foreach (var doc in cursor.Result)
        {
            var user = UserMapper.ToDomain(doc);
            if (user != null) users.Add(user);
        }

        return Tuple.Create<IEnumerable<User>, int>(users, totalCount);
    }

    public async Task<IEnumerable<User>> SearchAsync(string searchTerm)
    {
        var query = $@"
            FOR u IN {CollectionName}
            FILTER CONTAINS(LOWER(u.Email), LOWER(@term))
                OR CONTAINS(LOWER(u.Username), LOWER(@term))
                OR CONTAINS(LOWER(u.Role), LOWER(@term))
            RETURN u";

        var bindVars = new Dictionary<string, object> { { "term", searchTerm } };
        var cursor = await _context.Client.Cursor.PostCursorAsync<UserDocument>(query, bindVars);

        var users = new List<User>();
        foreach (var doc in cursor.Result)
        {
            var user = UserMapper.ToDomain(doc);
            if (user != null) users.Add(user);
        }
        return users;
    }
}
