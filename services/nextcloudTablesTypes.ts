export interface TablesStatus {
    configured: boolean;
    available: boolean;
    urlStyle?: 'index.php' | 'pretty';
    error?: string;
}

export interface TablesTable {
    id: number;
    title: string;
    description?: string;
    ownership?: string;
    url?: string;
}

export interface TablesColumn {
    id: number;
    title: string;
    type?: string;
    mandatory?: boolean;
}

export interface TablesSchema {
    tableId: number;
    columns: TablesColumn[];
}

export interface TablesRow {
    id: number;
    cells: Record<string, string>;
}

export interface TablesRowsResult {
    tableId: number;
    rows: TablesRow[];
    columns?: TablesColumn[];
    limit: number;
    offset: number;
    hasMore: boolean;
}
