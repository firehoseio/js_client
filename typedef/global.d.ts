declare var __VERSION__: string
declare var __CODE_NAME__: string

declare interface ObjectConstructor {
  assign(target: any, ...sources: any[]): any;
}