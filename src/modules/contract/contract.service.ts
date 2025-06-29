import { GenericService } from '../Generic Service/generic.services';
import { Contract } from './contract.model';

export class ContractService extends GenericService<typeof Contract> {
  constructor() {
    super(Contract);
  }
}
