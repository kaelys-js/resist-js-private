import { any, type InferOutput, strictObject } from "valibot";

export const globalConfigSchema = strictObject({
    // TODO: Implement
    owner: any(),
    runtime: any(),
    environment: any(),
    serviceName: any(),
    serviceVersion: any(),
    deploymentId: any()
}) // TODO: Error Message

export type GlobalConfig = InferOutput<typeof globalConfigSchema>