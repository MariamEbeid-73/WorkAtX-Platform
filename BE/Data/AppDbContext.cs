using Microsoft.EntityFrameworkCore;
using BE.Models;

namespace BE.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<MessageUsage> MessageUsages => Set<MessageUsage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasIndex(u => u.ClerkUserId).IsUnique().HasDatabaseName("IX_Users_ClerkUserId");
            entity.HasIndex(u => u.Email).IsUnique().HasDatabaseName("IX_Users_Email");
            entity.Property(u => u.CreatedAt).HasDefaultValueSql("NOW()");
        });

       
    }
}
