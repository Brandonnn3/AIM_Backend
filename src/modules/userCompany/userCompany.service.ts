import { GenericService } from "../Generic Service/generic.services";
import { UserCompany } from "./userCompany.model";

export class UserCompanyService extends GenericService<typeof UserCompany> {
    constructor() {
        super(UserCompany);
    }
}