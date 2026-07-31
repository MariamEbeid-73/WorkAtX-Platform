using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BE.Migrations
{
    /// <inheritdoc />
    public partial class AddAnalysisStalenessAndProfileScores : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsStale",
                table: "UserAnalyses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "ResumeFileId",
                table: "UserAnalyses",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ProfileScores",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    BreakdownJson = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProfileScores", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_ProfileScores_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserAnalyses_ResumeFileId",
                table: "UserAnalyses",
                column: "ResumeFileId");

            migrationBuilder.AddForeignKey(
                name: "FK_UserAnalyses_ResumeFiles_ResumeFileId",
                table: "UserAnalyses",
                column: "ResumeFileId",
                principalTable: "ResumeFiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_UserAnalyses_ResumeFiles_ResumeFileId",
                table: "UserAnalyses");

            migrationBuilder.DropTable(
                name: "ProfileScores");

            migrationBuilder.DropIndex(
                name: "IX_UserAnalyses_ResumeFileId",
                table: "UserAnalyses");

            migrationBuilder.DropColumn(
                name: "IsStale",
                table: "UserAnalyses");

            migrationBuilder.DropColumn(
                name: "ResumeFileId",
                table: "UserAnalyses");
        }
    }
}
