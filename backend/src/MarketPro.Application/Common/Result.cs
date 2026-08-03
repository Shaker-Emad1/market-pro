namespace MarketPro.Application.Common;

public class Result<T>
{
    public bool Success { get; init; }
    public T? Data { get; init; }
    public string? Error { get; init; }
    public List<string> Errors { get; init; } = new();

    public static Result<T> Ok(T data) => new() { Success = true, Data = data };
    public static Result<T> Fail(string error) => new() { Success = false, Error = error };
    public static Result<T> Fail(List<string> errors) => new() { Success = false, Errors = errors, Error = errors.FirstOrDefault() };
}

public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = Array.Empty<T>();
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}
