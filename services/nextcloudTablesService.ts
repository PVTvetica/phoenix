import apiService from './apiService';
import type {
    TablesColumn,
    TablesRowsResult,
    TablesSchema,
    TablesStatus,
    TablesTable,
} from './nextcloudTablesTypes';

export type {
    TablesColumn,
    TablesRow,
    TablesRowsResult,
    TablesSchema,
    TablesStatus,
    TablesTable,
} from './nextcloudTablesTypes';

class NextcloudTablesService {
    async getStatus(): Promise<TablesStatus> {
        return apiService.getTablesStatus();
    }

    async getTables(): Promise<TablesTable[]> {
        const res = await apiService.getTables();
        return res.tables;
    }

    async getSchema(tableId: number): Promise<TablesSchema> {
        return apiService.getTableSchema(tableId);
    }

    async getRows(tableId: number, limit?: number, offset?: number): Promise<TablesRowsResult> {
        return apiService.getTableRows(tableId, limit, offset);
    }
}

export const nextcloudTablesService = new NextcloudTablesService();
export default nextcloudTablesService;
