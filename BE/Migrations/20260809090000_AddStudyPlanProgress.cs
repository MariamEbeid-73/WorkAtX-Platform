using BE.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BE.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20260809090000_AddStudyPlanProgress")]
public partial class AddStudyPlanProgress : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "ProgressJson",
            table: "UserStudyPlans",
            type: "jsonb",
            nullable: false,
            defaultValue: "{}");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "ProgressJson",
            table: "UserStudyPlans");
    }
}
