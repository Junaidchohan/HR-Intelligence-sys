"""add rubric relation to screening and make job nullable

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-08

"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SQLite doesn't support ALTER COLUMN or drop constraint easily without copying table,
    # but we can use Alembic's batch_alter_table.
    with op.batch_alter_table("screenings") as batch_op:
        batch_op.alter_column("job_id", existing_type=sa.Integer(), nullable=True)
        batch_op.add_column(sa.Column("rubric_id", sa.Integer(), sa.ForeignKey("rubrics.id", name="fk_screenings_rubrics"), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("screenings") as batch_op:
        batch_op.drop_column("rubric_id")
        batch_op.alter_column("job_id", existing_type=sa.Integer(), nullable=False)
