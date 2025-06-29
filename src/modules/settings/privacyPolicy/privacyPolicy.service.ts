// import { GenericService } from "../../Generic Service/generic.services";
// import { IPrivacyPolicy } from "./privacyPolicy.interface";
// import { PrivacyPolicy } from "./privacyPolicy.model";

// //[🚧][🧑‍💻✅][🧪] // 🆗

// export class PrivacyPolicyService extends GenericService<typeof PrivacyPolicy> {
//     constructor() {
//         super(PrivacyPolicy);
//     }

//     async createOrUpdatePrivacyPolicy (payload: Partial<IPrivacyPolicy>)  {
//       const existingPrivacyPolicy = await PrivacyPolicy.findOne();

//       if (existingPrivacyPolicy) {
//         existingPrivacyPolicy.set(payload);
//         await existingPrivacyPolicy.save();
//         return existingPrivacyPolicy;
//       } else {
//         const newPrivacyPolicy = await PrivacyPolicy.create(payload);
//         return newPrivacyPolicy;
//       }
//     };

//     async getPrivacyPolicy () {
//       const result = await PrivacyPolicy.findOne().sort({ createdAt: -1 });
//       return result;
//     };

// }
