'use client';

import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';

type ValidationError = {
  row: number;
  field: string;
  code: string;
  message: string;
};

type ValidationRow = {
  row: number;
  product_id?: string | null;
  name?: string | null;
  category?: string | null;
  brand?: string | null;
  price?: number | null;
  stock?: number | null;
  image_url?: string | null;
  description?: string | null;
  status: 'valid' | 'invalid';
};

type ValidationResult = {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  errors: ValidationError[];
  preview: ValidationRow[];
};

type ImportResult = {
  imported_count: number;
  failed_count: number;
  inventory_created: number;
  categories_created: number;
  search_index_updated: boolean;
  errors: ValidationError[];
};

const SAMPLE_CSV = `product_id,name,category,brand,price,stock,image_url,description
P001,Nike Air Max,Shoes,Nike,4999,25,image1.jpg,Running shoe
P002,Nike Revolution,Shoes,Nike,3499,15,image2.jpg,Daily trainer
P003,Puma Runner,Shoes,Puma,2999,30,image3.jpg,Lightweight shoe`;

function parsePreview(csv: string): ValidationRow[] {
  const [headerLine, ...rows] = csv.trim().split(/\r?\n/);
  if (!headerLine || !rows.length) return [];
  const headers = headerLine.split(',').map((header) => header.trim());

  return rows.slice(0, 10).map((line, index) => {
    const values = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((header, headerIndex) => {
      row[header] = (values[headerIndex] ?? '').trim();
    });

    return {
      row: index + 2,
      product_id: row.product_id,
      name: row.name,
      category: row.category,
      brand: row.brand,
      price: row.price ? Number(row.price) : null,
      stock: row.stock ? Number(row.stock) : null,
      image_url: row.image_url,
      description: row.description,
      status: 'valid',
    };
  });
}

export default function StorePage() {
  const { getToken } = useAuth();
  const [fileName, setFileName] = useState('sample CSV');
  const [isDragging, setIsDragging] = useState(false);
  const [csvContent, setCsvContent] = useState(SAMPLE_CSV);
  const [preview, setPreview] = useState<ValidationRow[]>(parsePreview(SAMPLE_CSV));
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [storeName, setStoreName] = useState('');
  const [assignedStoreName, setAssignedStoreName] = useState<string | null>(null);
  const [busy, setBusy] = useState<'validate' | 'import' | 'template' | null>(null);
  const [message, setMessage] = useState('Use the sample CSV or upload your own product catalog.');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function fetchUserStore() {
      try {
        const token = await getToken();
        if (!token) return;
        const res = await apiFetch('/api/v1/users/me', token);
        if (res.ok) {
          const userDetails = await res.json();
          if (userDetails.store_name) {
            setAssignedStoreName(userDetails.store_name);
            setStoreName(userDetails.store_name);
          }
        }
      } catch (e) {
        console.error('Error fetching user store details', e);
      }
    }
    void fetchUserStore();
  }, [getToken]);

  const validPreviewCount = useMemo(() => preview.filter((row) => row.name).length, [preview]);

  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) return undefined;

    const syncSelectedFile = () => {
      const selectedFile = input.files?.[0];
      if (selectedFile && selectedFile.name !== fileName) {
        void handleFile(selectedFile);
      }
    };

    const handleNativeInput = (event: Event) => {
      const target = event.currentTarget as HTMLInputElement | null;
      const selectedFile = target?.files?.[0] ?? null;
      if (selectedFile) {
        void handleFile(selectedFile);
      }
    };

    input.addEventListener('change', handleNativeInput);
    input.addEventListener('input', handleNativeInput);

    const interval = window.setInterval(syncSelectedFile, 300);
    return () => {
      input.removeEventListener('change', handleNativeInput);
      input.removeEventListener('input', handleNativeInput);
      window.clearInterval(interval);
    };
  }, [fileName]);

  async function sendCsv(endpoint: '/api/v1/products/validate-csv' | '/api/v1/products/import') {
    const token = await getToken();
    const body: any = { csv_content: csvContent };
    if (endpoint === '/api/v1/products/import' && storeName) body.store_name = storeName;

    const res = await apiFetch(endpoint, token, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setMessage(body?.detail ?? 'Request failed');
      return null;
    }

    return res.json();
  }

  async function handleFile(file: File) {
    setFileName(file.name);
    setValidation(null);
    setImportResult(null);
    setMessage(`Loaded ${file.name}. Validate it before import.`);

    const text = await file.text();
    setCsvContent(text);
    setPreview(parsePreview(text));
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) {
      await handleFile(file);
    }
  }

  async function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    await handleFiles(event.dataTransfer.files);
  }

  async function handleValidate() {
    setBusy('validate');
    setMessage('Validating CSV...');
    const result = await sendCsv('/api/v1/products/validate-csv');
    if (result) {
      setValidation(result);
      setMessage(
        result.invalid_rows
          ? 'Validation found issues to fix.'
          : 'CSV looks good. Ready to import.',
      );
    }
    setBusy(null);
  }

  async function handleImport() {
    setBusy('import');
    setMessage('Importing products...');
    const result = await sendCsv('/api/v1/products/import');
    if (result) {
      setImportResult(result);
      setMessage(`Imported ${result.imported_count} products and created inventory records.`);
    }
    setBusy(null);
  }

  async function handleTemplateDownload() {
    setBusy('template');
    const res = await apiFetch('/api/v1/products/template');
    if (!res.ok) {
      setMessage('Could not load template.');
      setBusy(null);
      return;
    }

    const csv = await res.text();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Downloaded the CSV template.');
    setBusy(null);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-indigo-300/80">Store onboarding</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">CSV Product Upload</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Upload a product catalog, validate each row, and import products into inventory and
            search.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-700 hover:bg-zinc-800"
        >
          Back to overview
        </Link>
      </div>

      {assignedStoreName && (
        <div className="rounded-2xl bg-indigo-600/10 border border-indigo-500/20 px-5 py-3 text-sm text-indigo-300 flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-indigo-400" />
          <span>
            Importing catalog specifically for your store:{' '}
            <strong className="text-white">{assignedStoreName}</strong>
          </span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Rows previewed', value: preview.length },
          { label: 'Valid preview rows', value: validPreviewCount },
          { label: 'Imported products', value: importResult?.imported_count ?? '—' },
          { label: 'Validation errors', value: validation?.invalid_rows ?? '—' },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/20 backdrop-blur"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">{card.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Upload catalog</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Drop a CSV file or paste content from a spreadsheet export.
              </p>
            </div>
            <button
              type="button"
              onClick={handleTemplateDownload}
              disabled={busy === 'template'}
              className="inline-flex items-center rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-200 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === 'template' ? 'Preparing...' : 'Download template'}
            </button>
          </div>

          <div
            className={`mt-6 rounded-3xl border border-dashed px-6 py-8 transition ${
              isDragging ? 'border-indigo-400 bg-indigo-500/10' : 'border-zinc-700 bg-zinc-900/60'
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <div className="flex flex-col gap-4 text-center">
              <div>
                <p className="text-base font-medium text-zinc-100">
                  Drag and drop your CSV file here
                </p>
                <p className="mt-1 text-sm text-zinc-500">or choose a file below</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="mx-auto block w-full max-w-md cursor-pointer rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-200 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-500 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:border-zinc-500"
                onInput={(event) => {
                  void handleFiles(event.currentTarget.files);
                }}
                onChange={(event) => {
                  void handleFiles(event.target.files);
                }}
              />
              <p className="text-xs text-zinc-600">Selected file: {fileName}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleValidate}
              disabled={busy === 'validate'}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === 'validate' ? 'Validating...' : 'Validate CSV'}
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={busy === 'import'}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy === 'import' ? 'Importing...' : 'Import Products'}
            </button>
          </div>

          {/* Managed Store Admin Account - No store name select option */}

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
            {message}
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800">
            <div className="border-b border-zinc-800 bg-zinc-900 px-4 py-3">
              <h3 className="text-sm font-medium text-white">Preview</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-800 text-sm">
                <thead className="bg-zinc-950 text-zinc-400">
                  <tr>
                    {['ID', 'Name', 'Category', 'Brand', 'Price', 'Stock', 'Status'].map(
                      (column) => (
                        <th key={column} className="px-4 py-3 text-left font-medium">
                          {column}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 bg-zinc-950/60 text-zinc-200">
                  {preview.map((row) => (
                    <tr key={row.row}>
                      <td className="px-4 py-3 text-zinc-400">{row.product_id || '—'}</td>
                      <td className="px-4 py-3">{row.name || '—'}</td>
                      <td className="px-4 py-3">{row.category || '—'}</td>
                      <td className="px-4 py-3">{row.brand || '—'}</td>
                      <td className="px-4 py-3">{row.price ?? '—'}</td>
                      <td className="px-4 py-3">{row.stock ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.status === 'valid' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!preview.length && (
                    <tr>
                      <td className="px-4 py-6 text-center text-zinc-500" colSpan={7}>
                        Load a CSV file to see the first 10 rows here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">Validation summary</h2>
            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <div className="flex items-center justify-between rounded-xl bg-zinc-950/60 px-4 py-3">
                <span>Total rows</span>
                <span className="font-medium text-white">{validation?.total_rows ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-950/60 px-4 py-3">
                <span>Valid rows</span>
                <span className="font-medium text-emerald-300">
                  {validation?.valid_rows ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-950/60 px-4 py-3">
                <span>Invalid rows</span>
                <span className="font-medium text-red-300">{validation?.invalid_rows ?? '—'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">Import summary</h2>
            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <div className="flex items-center justify-between rounded-xl bg-zinc-950/60 px-4 py-3">
                <span>Imported products</span>
                <span className="font-medium text-white">
                  {importResult?.imported_count ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-950/60 px-4 py-3">
                <span>Failed rows</span>
                <span className="font-medium text-red-300">
                  {importResult?.failed_count ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-950/60 px-4 py-3">
                <span>Inventory created</span>
                <span className="font-medium text-white">
                  {importResult?.inventory_created ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-zinc-950/60 px-4 py-3">
                <span>Search index updated</span>
                <span className="font-medium text-emerald-300">
                  {importResult?.search_index_updated ? 'Yes' : '—'}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/10 p-6 text-sm text-indigo-100 shadow-lg shadow-black/20 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">CSV rules</h2>
            <ul className="mt-4 space-y-2 text-indigo-100/80">
              <li>• product_id, name, category, brand, price, stock, and image_url are required</li>
              <li>• price must be numeric and non-negative</li>
              <li>• stock must be a non-negative integer</li>
              <li>• duplicate product IDs are blocked</li>
            </ul>
          </div>

          {validation?.errors?.length ? (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-100 shadow-lg shadow-black/20 backdrop-blur">
              <h2 className="text-lg font-semibold text-white">Validation errors</h2>
              <div className="mt-4 space-y-3">
                {validation.errors.map((error, index) => (
                  <div
                    key={`${error.row}-${error.field}-${index}`}
                    className="rounded-xl bg-zinc-950/60 px-4 py-3"
                  >
                    <p className="font-medium text-white">
                      Row {error.row}: {error.message}
                    </p>
                    <p className="text-red-200/80">
                      Field: {error.field} • Code: {error.code}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
