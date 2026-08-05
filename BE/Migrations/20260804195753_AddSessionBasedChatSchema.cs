using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BE.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionBasedChatSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Jobs_ChatSessions_SessionId1",
                table: "Jobs");

            migrationBuilder.DropIndex(
                name: "IX_Jobs_SessionId1",
                table: "Jobs");

            migrationBuilder.DropColumn(
                name: "SessionId1",
                table: "Jobs");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SessionId1",
                table: "Jobs",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_SessionId1",
                table: "Jobs",
                column: "SessionId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Jobs_ChatSessions_SessionId1",
                table: "Jobs",
                column: "SessionId1",
                principalTable: "ChatSessions",
                principalColumn: "Id");
        }
    }
}
