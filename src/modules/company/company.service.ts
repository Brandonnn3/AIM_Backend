import { GenericService } from "../Generic Service/generic.services";
import { Company } from "./company.model";

export class CompanyService extends GenericService<typeof Company> {
    constructor() {
        super(Company);
    }
}