using Microsoft.EntityFrameworkCore;
using BE.Models;

namespace BE.Data;

/// <summary>
/// EF Core DbContext for WorkX.
/// Configured for SQL Server via the connection string in appsettings.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── User Configuration ──────────────────────────────
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");

            entity.HasIndex(u => u.ClerkUserId)
                  .IsUnique()
                  .HasDatabaseName("IX_Users_ClerkUserId");

            entity.HasIndex(u => u.Email)
                  .IsUnique()
                  .HasDatabaseName("IX_Users_Email");

            entity.Property(u => u.CreatedAt)
                  .HasDefaultValueSql("SYSDATETIMEOFFSET()");
        });

        // ── Subscription Configuration ──────────────────────
        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.ToTable("Subscriptions");

            entity.HasOne(s => s.User)
                  .WithMany(u => u.Subscriptions)
                  .HasForeignKey(s => s.UserId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(s => s.UserId)
                  .HasDatabaseName("IX_Subscriptions_UserId");

            entity.Property(s => s.PlanType)
                  .HasDefaultValue("FREE_TRIAL");

            entity.Property(s => s.IsActive)
                  .HasDefaultValue(true);

            entity.Property(s => s.CreatedAt)
                  .HasDefaultValueSql("SYSDATETIMEOFFSET()");

            entity.Property(s => s.UpdatedAt)
                  .HasDefaultValueSql("SYSDATETIMEOFFSET()");
        });
    }
}
