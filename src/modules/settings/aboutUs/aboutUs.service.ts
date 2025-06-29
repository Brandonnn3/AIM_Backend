// import { GenericService } from '../../Generic Service/generic.services';
// import { IAboutUs } from './aboutUs.interface';
// import AboutUs from './aboutUs.model';

// //[🚧][🧑‍💻✅][🧪] // 🆗
// export class AboutUsService extends GenericService<typeof AboutUs> {
//     constructor() {
//         super(AboutUs);
//     }

//     // Create or Update only one "About Us" entry
//     async createOrUpdateAboutUs  (payload: Partial<IAboutUs>) {
//     const existingAboutUs = await AboutUs.findOne();

//       if (existingAboutUs) {
//         existingAboutUs.set(payload);
//         await existingAboutUs.save();
//         return existingAboutUs;
//       } else {
//         const newAboutUs = await AboutUs.create(payload);
//         return newAboutUs;
//       }
//     };

//     async getAboutUs()  {
//       const aboutUs = await AboutUs.findOne().sort({ createdAt: -1 });
//       return aboutUs;
//     };
// }
