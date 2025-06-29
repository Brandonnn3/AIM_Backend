// import { GenericService } from '../../Generic Service/generic.services';
// import { ITermsConditions } from './termsConditions.interface';
// import { TermsConditions } from './termsConditions.model';

// //[🚧][🧑‍💻✅][🧪] // 🆗

// export class TermsConditionService extends GenericService<typeof TermsConditions> {
//     constructor() {
//         super(TermsConditions);
//     }

//     async createOrUpdateTermsConditions   (
//       payload: Partial<ITermsConditions>
//     ) {
//       const existingTermsConditions = await TermsConditions.findOne();

//       if (existingTermsConditions) {
//         existingTermsConditions.set(payload);
//         await existingTermsConditions.save();
//         return existingTermsConditions;
//       } else {
//         const newTermsConditions = await TermsConditions.create(payload);
//         return newTermsConditions;
//       }
//     };

//     async getTermsConditions () {
//       const result = await TermsConditions.findOne().sort({ createdAt: -1 });
//       return result;
//     };
// }
