using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BE.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionBasedChat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_UserStudyPlans",
                table: "UserStudyPlans");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserGapAnalyses",
                table: "UserGapAnalyses");

            migrationBuilder.AddColumn<Guid>(
                name: "Id",
                table: "UserStudyPlans",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "JobId",
                table: "UserStudyPlans",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SessionId",
                table: "UserStudyPlans",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "Id",
                table: "UserGapAnalyses",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "JobId",
                table: "UserGapAnalyses",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SessionId",
                table: "UserGapAnalyses",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<Guid>(
                name: "SessionId",
                table: "Jobs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SessionId1",
                table: "Jobs",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserStudyPlans",
                table: "UserStudyPlans",
                column: "Id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserGapAnalyses",
                table: "UserGapAnalyses",
                column: "Id");

            migrationBuilder.CreateTable(
                name: "ChatSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    SummaryText = table.Column<string>(type: "text", nullable: true),
                    SummaryUpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    LastMessageAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChatSessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ChatMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SessionId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Role = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Content = table.Column<string>(type: "text", nullable: false),
                    ResponseType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    JobId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ChatMessages_ChatSessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "ChatSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ChatMessages_Jobs_JobId",
                        column: x => x.JobId,
                        principalTable: "Jobs",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_StudyPlans_User_Session",
                table: "UserStudyPlans",
                columns: new[] { "UserId", "SessionId" });

            migrationBuilder.CreateIndex(
                name: "IX_UserStudyPlans_SessionId",
                table: "UserStudyPlans",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_GapAnalyses_User_Session",
                table: "UserGapAnalyses",
                columns: new[] { "UserId", "SessionId" });

            migrationBuilder.CreateIndex(
                name: "IX_UserGapAnalyses_SessionId",
                table: "UserGapAnalyses",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_SessionId",
                table: "Jobs",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_SessionId1",
                table: "Jobs",
                column: "SessionId1");

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessages_JobId",
                table: "ChatMessages",
                column: "JobId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessages_SessionId",
                table: "ChatMessages",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatSessions_UserId",
                table: "ChatSessions",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Jobs_ChatSessions_SessionId",
                table: "Jobs",
                column: "SessionId",
                principalTable: "ChatSessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Jobs_ChatSessions_SessionId1",
                table: "Jobs",
                column: "SessionId1",
                principalTable: "ChatSessions",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_UserGapAnalyses_ChatSessions_SessionId",
                table: "UserGapAnalyses",
                column: "SessionId",
                principalTable: "ChatSessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_UserStudyPlans_ChatSessions_SessionId",
                table: "UserStudyPlans",
                column: "SessionId",
                principalTable: "ChatSessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Jobs_ChatSessions_SessionId",
                table: "Jobs");

            migrationBuilder.DropForeignKey(
                name: "FK_Jobs_ChatSessions_SessionId1",
                table: "Jobs");

            migrationBuilder.DropForeignKey(
                name: "FK_UserGapAnalyses_ChatSessions_SessionId",
                table: "UserGapAnalyses");

            migrationBuilder.DropForeignKey(
                name: "FK_UserStudyPlans_ChatSessions_SessionId",
                table: "UserStudyPlans");

            migrationBuilder.DropTable(
                name: "ChatMessages");

            migrationBuilder.DropTable(
                name: "ChatSessions");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserStudyPlans",
                table: "UserStudyPlans");

            migrationBuilder.DropIndex(
                name: "IX_StudyPlans_User_Session",
                table: "UserStudyPlans");

            migrationBuilder.DropIndex(
                name: "IX_UserStudyPlans_SessionId",
                table: "UserStudyPlans");

            migrationBuilder.DropPrimaryKey(
                name: "PK_UserGapAnalyses",
                table: "UserGapAnalyses");

            migrationBuilder.DropIndex(
                name: "IX_GapAnalyses_User_Session",
                table: "UserGapAnalyses");

            migrationBuilder.DropIndex(
                name: "IX_UserGapAnalyses_SessionId",
                table: "UserGapAnalyses");

            migrationBuilder.DropIndex(
                name: "IX_Jobs_SessionId",
                table: "Jobs");

            migrationBuilder.DropIndex(
                name: "IX_Jobs_SessionId1",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "UserStudyPlans");

            migrationBuilder.DropColumn(
                name: "JobId",
                table: "UserStudyPlans");

            migrationBuilder.DropColumn(
                name: "SessionId",
                table: "UserStudyPlans");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "UserGapAnalyses");

            migrationBuilder.DropColumn(
                name: "JobId",
                table: "UserGapAnalyses");

            migrationBuilder.DropColumn(
                name: "SessionId",
                table: "UserGapAnalyses");

            migrationBuilder.DropColumn(
                name: "SessionId",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "SessionId1",
                table: "Jobs");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserStudyPlans",
                table: "UserStudyPlans",
                column: "UserId");

            migrationBuilder.AddPrimaryKey(
                name: "PK_UserGapAnalyses",
                table: "UserGapAnalyses",
                column: "UserId");
        }
    }
}
