"use client"

import { DownloadIcon, ExternalLinkIcon, FileArchiveIcon, FileIcon, FileImageIcon, FileSpreadsheetIcon, FileTextIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { TableRender } from "@/components/data-table/table-render"
import type { TableColumn } from "@/components/data-table/types"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { FormDialog } from "@/components/forms/form-dialog"
import { EmptyState } from "@/components/layout/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatFileSize } from "@/config/documents"
import { TASK_VISIBILITY_LABELS } from "@/config/domain"
import { useServerAction } from "@/hooks/use-server-action"
import { formatDate } from "@/lib/format"
import type { Facet, PageResult } from "@/lib/list-params"
import { deleteDocument } from "@/server/modules/documents/actions"
import type { DocumentRow } from "@/server/modules/documents/queries"
import { DocumentForm } from "./document-form"

interface DocumentsTableProps {
  projectId: string
  result: PageResult<DocumentRow>
  facets: Facet[]
  canUpload: boolean
  isClientViewer: boolean
}

function iconFor(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImageIcon
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType === "text/csv") return FileSpreadsheetIcon
  if (mimeType === "application/zip") return FileArchiveIcon
  if (mimeType === "application/pdf" || mimeType.includes("word") || mimeType.includes("text")) return FileTextIcon
  return FileIcon
}

const documentUrl = (id: string) => `/api/documents/${id}`

function RowActions({ projectId, document }: { projectId: string; document: DocumentRow }) {
  const router = useRouter()
  const { isPending, run } = useServerAction()
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${document.title}`} disabled={isPending} />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<a href={`${documentUrl(document.id)}?download`} download />}>
            <DownloadIcon aria-hidden />
            Download
          </DropdownMenuItem>
          {document.canModify ? (
            <>
              <DropdownMenuItem onClick={() => setDialog("edit")}>
                <PencilIcon aria-hidden />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDialog("delete")}>
                <Trash2Icon aria-hidden />
                Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={dialog === "edit"} onOpenChange={(open) => setDialog(open ? "edit" : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit {document.title}</DialogTitle>
          </DialogHeader>
          {dialog === "edit" ? <DocumentForm projectId={projectId} document={document} onSaved={() => setDialog(null)} /> : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        title={`Delete ${document.title}?`}
        description="The file is removed for everyone on the project, including the client if it was shared."
        confirmLabel="Delete"
        destructive
        onConfirm={() => run(() => deleteDocument({ documentId: document.id }), "Document deleted", () => router.refresh())}
      />
    </>
  )
}

function buildColumns(projectId: string, isClientViewer: boolean): TableColumn<DocumentRow>[] {
  const columns: TableColumn<DocumentRow>[] = [
    {
      id: "title",
      header: "Document",
      sortable: true,
      cell: (row) => {
        const Icon = iconFor(row.mimeType)
        return (
          <div className="flex min-w-0 items-center gap-3">
            <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <a href={documentUrl(row.id)} target="_blank" rel="noopener" className="flex items-center gap-1.5 truncate font-medium hover:underline">
                {row.title}
                <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <span className="block truncate text-xs text-muted-foreground">{row.fileName}</span>
            </div>
          </div>
        )
      },
    },
    { id: "size", header: "Size", sortable: true, hideBelow: "sm", className: "tabular-nums", cell: (row) => formatFileSize(row.sizeBytes) },
    {
      id: "createdAt",
      header: "Uploaded",
      sortable: true,
      hideBelow: "md",
      cell: (row) => (
        <div>
          <span className="block">{formatDate(row.createdAt)}</span>
          {row.uploadedBy ? <span className="block text-xs text-muted-foreground">{row.uploadedBy}</span> : null}
        </div>
      ),
    },
  ]
  if (!isClientViewer) {
    columns.push({
      id: "visibility",
      header: "Visibility",
      hideBelow: "sm",
      cell: (row) => <Badge variant={row.visibility === "client" ? "outline" : "secondary"}>{TASK_VISIBILITY_LABELS[row.visibility]}</Badge>,
    })
  }
  columns.push({ id: "actions", header: "", className: "w-10 text-right", cell: (row) => <RowActions projectId={projectId} document={row} /> })
  return columns
}

export function DocumentsTable({ projectId, result, facets, canUpload, isClientViewer }: DocumentsTableProps) {
  const uploadDialog = canUpload ? (
    <FormDialog
      title="Upload document"
      description="Requirements, designs, contracts or any file the project needs."
      className="sm:max-w-lg"
      trigger={
        <Button>
          <UploadIcon aria-hidden />
          Upload
        </Button>
      }
    >
      {(close) => <DocumentForm projectId={projectId} onSaved={close} />}
    </FormDialog>
  ) : null

  return (
    <TableRender
      columns={buildColumns(projectId, isClientViewer)}
      result={result}
      facets={facets}
      getRowId={(row) => row.id}
      searchPlaceholder="Search documents…"
      caption="Project documents"
      toolbarActions={uploadDialog}
      emptyState={
        <EmptyState
          icon={FileTextIcon}
          title="No documents yet"
          description={
            isClientViewer
              ? "Documents your project team shares with you will appear here."
              : "Upload requirements (SRS), designs, contracts and other files so the whole project team can find them in one place."
          }
        />
      }
    />
  )
}
