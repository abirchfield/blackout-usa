/** Error thrown when scripted grid mutations reference unknown IDs. */
export class GridMutationError extends Error {
  constructor(op: string, id: string) {
    super(`[${op}] unknown id: ${id}`);
    this.name = 'GridMutationError';
  }
}
