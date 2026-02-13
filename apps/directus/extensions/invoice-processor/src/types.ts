export interface EndpointContext {
  services: Record<string, any>;
  database: unknown;
  getSchema: () => Promise<unknown>;
}

export interface ServiceConstructor {
  new (collection: string, options: Record<string, unknown>): ItemsServiceInstance;
}

export interface ItemsServiceInstance {
  readByQuery(query: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  readOne(id: string, query?: Record<string, unknown>): Promise<Record<string, unknown>>;
  createOne(data: Record<string, unknown>): Promise<string>;
  updateOne(id: string, data: Record<string, unknown>): Promise<string>;
}

