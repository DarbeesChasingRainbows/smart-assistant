namespace LifeOS.Domain.Common
{
    // C# compatible Result type for interop with F# domain
    public static class Result
    {
        public static Result<TSuccess, TError> Ok<TSuccess, TError>(TSuccess value)
        {
            return new Result<TSuccess, TError>(value, default, true);
        }

        public static Result<TSuccess, TError> Error<TSuccess, TError>(TError error)
        {
            return new Result<TSuccess, TError>(default, error, false);
        }
    }

    public readonly struct Result<TSuccess, TError>
    {
        private readonly TSuccess _value;
        private readonly TError _error;
        private readonly bool _isSuccess;

        public TSuccess Value => _isSuccess ? _value : throw new InvalidOperationException("Cannot access Value when Result is an Error");
        public TError Error => !_isSuccess ? _error : throw new InvalidOperationException("Cannot access Error when Result is Ok");
        public bool IsSuccess => _isSuccess;
        public bool IsError => !_isSuccess;

        public Result(TSuccess value, TError error, bool isSuccess)
        {
            _value = value;
            _error = error;
            _isSuccess = isSuccess;
        }

        public static implicit operator Result<TSuccess, TError>(TSuccess value) => Result.Ok<TSuccess, TError>(value);
        public static implicit operator Result<TSuccess, TError>(TError error) => Result.Error<TSuccess, TError>(error);

        public TResult Match<TResult>(Func<TSuccess, TResult> onOk, Func<TError, TResult> onError)
        {
            return _isSuccess ? onOk(_value) : onError(_error);
        }

        public Result<TNewSuccess, TError> Map<TNewSuccess>(Func<TSuccess, TNewSuccess> mapper)
        {
            return _isSuccess ? Result.Ok<TNewSuccess, TError>(mapper(_value)) : Result.Error<TNewSuccess, TError>(_error);
        }
    }

    // Extensions for DomainError to work with C#
    public static partial class DomainErrorExtensions
    {
        public static string Message(this DomainError error) => error switch
        {
            DomainError.ValidationError msg => msg,
            DomainError.NotFoundError msg => msg,
            DomainError.BusinessRuleViolation msg => msg,
            DomainError.ConcurrencyError msg => msg,
            _ => "Unknown error"
        };

        public static DomainErrorType Type(this DomainError error) => error switch
        {
            DomainError.ValidationError => DomainErrorType.ValidationError,
            DomainError.NotFoundError => DomainErrorType.NotFoundError,
            DomainError.BusinessRuleViolation => DomainErrorType.BusinessRuleViolation,
            DomainError.ConcurrencyError => DomainErrorType.ConcurrencyError,
            _ => DomainErrorType.UnknownError
        };
    }

    public enum DomainErrorType
    {
        ValidationError,
        NotFoundError,
        BusinessRuleViolation,
        ConcurrencyError,
        UnknownError
    }
}
