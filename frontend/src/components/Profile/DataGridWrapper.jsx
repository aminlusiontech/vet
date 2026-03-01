import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DataGrid } from "@material-ui/data-grid";

const DataGridWrapper = React.memo(({ title, description, rows, columns, emptyMessage, cardClass, onRowClick }) => {
  const navigate = useNavigate();
  
  const handleRowClick = useCallback((params) => {
    if (onRowClick) {
      onRowClick(params, navigate);
    }
  }, [onRowClick, navigate]);

  return (
    <section className={cardClass}>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        {rows.length === 0 && emptyMessage && (
          <span className="text-sm font-medium text-slate-500">{emptyMessage}</span>
        )}
      </header>
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={10}
          disableSelectionOnClick
          autoHeight
          onRowClick={handleRowClick}
          sx={{
            "& .MuiDataGrid-row": {
              cursor: onRowClick ? "pointer" : "default",
            },
            "& .MuiDataGrid-row:hover": {
              backgroundColor: onRowClick ? "#f8fafc" : "transparent",
            },
          }}
        />
      </div>
    </section>
  );
});

DataGridWrapper.displayName = "DataGridWrapper";

export default DataGridWrapper;
