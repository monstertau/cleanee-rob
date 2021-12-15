export class Host {
    constructor(
        public readonly address: string,
        public readonly port: number
    ) {}

    toString(): string {
        return `${this.address}:${this.port}`;
    }
}