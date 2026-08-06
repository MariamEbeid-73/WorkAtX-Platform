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
    public DbSet<UserGapAnalysis> UserGapAnalyses => Set<UserGapAnalysis>();
    public DbSet<UserStudyPlan> UserStudyPlans => Set<UserStudyPlan>();
    public DbSet<ChatSession> ChatSessions => Set<ChatSession>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();

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
            entity.HasIndex(j => j.SessionId).HasDatabaseName("IX_Jobs_SessionId");

            entity.HasOne(j => j.Session).WithMany()
    .HasForeignKey(j => j.SessionId).OnDelete(DeleteBehavior.SetNull);
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

        modelBuilder.Entity<ChatSession>(entity =>
        {
            entity.ToTable("ChatSessions");
            entity.HasIndex(s => new { s.UserId, s.LastMessageAt }).HasDatabaseName("IX_ChatSessions_User_LastMessageAt");
            entity.HasOne(s => s.User).WithMany()
                .HasForeignKey(s => s.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.Property(s => s.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(s => s.UpdatedAt).HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<ChatMessage>(entity =>
        {
            entity.ToTable("ChatMessages");
            entity.HasIndex(m => new { m.SessionId, m.CreatedAt }).HasDatabaseName("IX_ChatMessages_Session_CreatedAt");
            entity.HasOne(m => m.Session).WithMany(s => s.Messages)
                .HasForeignKey(m => m.SessionId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(m => m.Job).WithMany()
                .HasForeignKey(m => m.JobId).OnDelete(DeleteBehavior.SetNull);
            entity.Property(m => m.CreatedAt).HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<UserGapAnalysis>(entity =>
        {
            entity.ToTable("UserGapAnalyses");
            entity.HasIndex(g => new { g.UserId, g.SessionId }).HasDatabaseName("IX_GapAnalyses_User_Session");
            entity.HasOne(g => g.User).WithMany()
                .HasForeignKey(g => g.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(g => g.Session).WithMany()
                .HasForeignKey(g => g.SessionId).OnDelete(DeleteBehavior.Cascade);
            entity.Property(g => g.ResultJson).HasColumnType("jsonb");
            entity.Property(g => g.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(g => g.UpdatedAt).HasDefaultValueSql("NOW()");
        });

        modelBuilder.Entity<UserStudyPlan>(entity =>
        {
            entity.ToTable("UserStudyPlans");
            entity.HasIndex(p => new { p.UserId, p.SessionId }).HasDatabaseName("IX_StudyPlans_User_Session");
            entity.HasOne(p => p.User).WithMany()
                .HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(p => p.Session).WithMany()
                .HasForeignKey(p => p.SessionId).OnDelete(DeleteBehavior.Cascade);
            entity.Property(p => p.ResultJson).HasColumnType("jsonb");
            entity.Property(p => p.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(p => p.UpdatedAt).HasDefaultValueSql("NOW()");
        });
    }
}