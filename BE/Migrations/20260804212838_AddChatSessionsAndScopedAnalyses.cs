using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BE.Migrations
{
    /// <inheritdoc />
    public partial class AddChatSessionsAndScopedAnalyses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChatMessages_Jobs_JobId",
                table: "ChatMessages");

            migrationBuilder.DropIndex(
                name: "IX_ChatSessions_UserId",
                table: "ChatSessions");

            migrationBuilder.DropIndex(
                name: "IX_ChatMessages_SessionId",
                table: "ChatMessages");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "ChatSessions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ChatSessions_User_LastMessageAt",
                table: "ChatSessions",
                columns: new[] { "UserId", "LastMessageAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessages_Session_CreatedAt",
                table: "ChatMessages",
                columns: new[] { "SessionId", "CreatedAt" });

            migrationBuilder.AddForeignKey(
                name: "FK_ChatMessages_Jobs_JobId",
                table: "ChatMessages",
                column: "JobId",
                principalTable: "Jobs",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ChatMessages_Jobs_JobId",
                table: "ChatMessages");

            migrationBuilder.DropIndex(
                name: "IX_ChatSessions_User_LastMessageAt",
                table: "ChatSessions");

            migrationBuilder.DropIndex(
                name: "IX_ChatMessages_Session_CreatedAt",
                table: "ChatMessages");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "ChatSessions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.CreateIndex(
                name: "IX_ChatSessions_UserId",
                table: "ChatSessions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ChatMessages_SessionId",
                table: "ChatMessages",
                column: "SessionId");

            migrationBuilder.AddForeignKey(
                name: "FK_ChatMessages_Jobs_JobId",
                table: "ChatMessages",
                column: "JobId",
                principalTable: "Jobs",
                principalColumn: "Id");
        }
    }
}
