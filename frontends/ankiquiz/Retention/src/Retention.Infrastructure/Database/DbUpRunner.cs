using System.Reflection;
using DbUp;

namespace Retention.Infrastructure.Database;

public class DbUpRunner
{
    private readonly string _connectionString;

    public DbUpRunner(string connectionString)
    {
        _connectionString = connectionString;
    }

    public void RunMigrations()
    {
        EnsureDatabase.For.PostgresqlDatabase(_connectionString);

        var upgrader = DeployChanges.To
            .PostgresqlDatabase(_connectionString)
            .WithScriptsEmbeddedInAssembly(Assembly.GetExecutingAssembly())
            .LogToConsole()
            .Build();

        var result = upgrader.PerformUpgrade();

        if (!result.Successful)
        {
            throw new Exception("Database migration failed", result.Error);
        }
    }
}
