using Microsoft.EntityFrameworkCore;
using BE.Models;

namespace BE.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<MessageUsage> MessageUsages => Set<MessageUsage>();
    public DbSet<OAuthToken> OAuthTokens => Set<OAuthToken>();
    public DbSet<ResumeFile> ResumeFiles => Set<ResumeFile>();

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

        modelBuilder.Entity<OAuthToken>(entity =>
        {
            entity.ToTable("OAuthTokens");
            entity.HasIndex(t => new { t.UserId, t.Provider })
                .IsUnique()
                .HasDatabaseName("IX_OAuthTokens_UserId_Provider");
            entity.HasOne(t => t.User).WithMany(u => u.OAuthTokens)
                .HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.Property(t => t.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(t => t.UpdatedAt).HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<ResumeFile>(entity =>
        {
            entity.ToTable("ResumeFiles");
            entity.HasIndex(r => r.UserId).HasDatabaseName("IX_ResumeFiles_UserId");
            entity.HasOne(r => r.User).WithMany(u => u.ResumeFiles)
                .HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.Property(r => r.CreatedAt).HasDefaultValueSql("NOW()");
        });
    }
}