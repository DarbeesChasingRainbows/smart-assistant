using LifeOS.Domain.Common;
using LifeOS.Domain.SharedKernel;
using LifeOS.Infrastructure.Persistence.Documents;

namespace LifeOS.Infrastructure.SharedKernel;

public static class UserMapper
{
    public static UserDocument ToDocument(User user)
    {
        return new UserDocument
        {
            Key = Id.userIdValue(user.Id).ToString(),
            Email = SharedKernelInterop.GetEmailValue(user.Email),
            Username = SharedKernelInterop.GetUsernameValue(user.Username),
            Role = SharedKernelInterop.RoleToString(user.Role),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    public static User? ToDomain(UserDocument? doc)
    {
        if (doc == null) return null;

        var emailResult = SharedKernelInterop.CreateEmail(doc.Email);
        var usernameResult = SharedKernelInterop.CreateUsername(doc.Username);
        var roleResult = SharedKernelInterop.ParseRole(doc.Role);

        if (emailResult.IsError || usernameResult.IsError || roleResult.IsError)
            return null;

        return SharedKernelInterop.CreateUserFrom(
            Id.createUserIdFrom(Guid.Parse(doc.Key)),
            emailResult.ResultValue,
            usernameResult.ResultValue,
            roleResult.ResultValue,
            doc.IsActive,
            doc.CreatedAt,
            doc.UpdatedAt);
    }
}
