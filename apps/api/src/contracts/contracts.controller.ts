import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { createContractSchema, updateContractSchema, type CreateContractInput, type UpdateContractInput } from "@zm/shared";
import { ZodPipe } from "../common/zod.pipe";
import { ContractsService } from "./contracts.service";

@Controller("contracts")
export class ContractsController {
  constructor(private readonly contracts: ContractsService) {}

  @Get()
  findAll() {
    return this.contracts.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.contracts.findOne(id);
  }

  @Post()
  create(@Body(new ZodPipe(createContractSchema)) body: CreateContractInput) {
    return this.contracts.create(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body(new ZodPipe(updateContractSchema)) body: UpdateContractInput) {
    return this.contracts.update(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.contracts.remove(id);
  }
}
