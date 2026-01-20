namespace LifeOS.Application.Common
{
    // C# compatible Result type for interop with F# domain
    public static class Result
    {
        public static Result<TSuccess, TError> Ok<TSuccess, TError>(TSuccess value)
        {
            return new Result<TSuccess, TError>(value, default!, true);
        }

        public static Result<TSuccess, TError> Error<TSuccess, TError>(TError error)
        {
            return new Result<TSuccess, TError>(default!, error, false);
        }
    }

    public readonly struct Result<TSuccess, TError>
    {
        private readonly TSuccess _value;
        private readonly TError _error;
        private readonly bool _isSuccess;

        public Result(TSuccess value, TError error, bool isSuccess)
        {
            _value = value;
            _error = error;
            _isSuccess = isSuccess;
        }

        public bool IsSuccess => _isSuccess;
        public bool IsError => !_isSuccess;

        public TSuccess Value
        {
            get
            {
                if (!_isSuccess)
                    throw new InvalidOperationException("Cannot access Value of an Error result");
                return _value;
            }
        }

        public TError Error
        {
            get
            {
                if (_isSuccess)
                    throw new InvalidOperationException("Cannot access Error of a Success result");
                return _error;
            }
        }

        public static implicit operator Result<TSuccess, TError>(TSuccess value) => Result.Ok<TSuccess, TError>(value);
        public static implicit operator Result<TSuccess, TError>(TError error) => Result.Error<TSuccess, TError>(error);
    }
}
