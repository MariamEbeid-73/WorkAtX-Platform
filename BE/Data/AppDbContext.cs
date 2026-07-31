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
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<UserAnalysis> UserAnalyses => Set<UserAnalysis>();
    public DbSet<ProfileScore> ProfileScores => Set<ProfileScore>();

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

        modelBuilder.Entity<Job>(entity =>
        {
            entity.ToTable("Jobs");
            entity.HasIndex(j => j.UserId).HasDatabaseName("IX_Jobs_UserId");
            entity.HasIndex(j => j.Status).HasDatabaseName("IX_Jobs_Status");
            entity.HasOne(j => j.User).WithMany()
                .HasForeignKey(j => j.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.Property(j => j.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(j => j.UpdatedAt).HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<UserAnalysis>(entity =>
        {
            entity.ToTable("UserAnalyses");
            entity.HasOne(a => a.User).WithOne()
                .HasForeignKey<UserAnalysis>(a => a.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(a => a.ResumeFile).WithMany()
                .HasForeignKey(a => a.ResumeFileId).OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(a => a.ResumeFileId).HasDatabaseName("IX_UserAnalyses_ResumeFileId");
            entity.Property(a => a.ResultJson).HasColumnType("jsonb");
            entity.Property(a => a.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(a => a.UpdatedAt).HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<ProfileScore>(entity =>
        {
            entity.ToTable("ProfileScores");
            entity.HasOne(p => p.User).WithOne()
                .HasForeignKey<ProfileScore>(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.Property(p => p.BreakdownJson).HasColumnType("jsonb");
            entity.Property(p => p.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(p => p.UpdatedAt).HasDefaultValueSql("NOW()");
        });
    }
}