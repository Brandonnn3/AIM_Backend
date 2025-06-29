// import { GenericService } from '../../Generic Service/generic.services';
// import { IContactUs } from './contactUs.interface';
// import ContactUs from './contactUs.model';

// export class ContactUsService extends GenericService<typeof ContactUs> {
//     constructor() {
//         super(ContactUs);
//     }

//     // Create or Update only one "About Us" entry
//     async createOrUpdateContactUs  (payload: Partial<IContactUs>) {
//     const existingContactUs = await ContactUs.findOne();

//       if (existingContactUs) {
//         existingContactUs.set(payload);
//         await existingContactUs.save();
//         return existingContactUs;
//       } else {
//         const newContactUs = await ContactUs.create(payload);
//         return newContactUs;
//       }
//     };

//     async getContactUs()  {
//       const contactUs = await ContactUs.findOne().sort({ createdAt: -1 });
//       return contactUs;
//     };
// }

/*
// Create or Update only one "About Us" entry
const createOrUpdateAboutUs = async (payload: Partial<IAboutUs>) => {
  const existingAboutUs = await AboutUs.findOne();

  if (existingAboutUs) {
    existingAboutUs.set(payload);
    await existingAboutUs.save();
    return existingAboutUs;
  } else {
    const newAboutUs = await AboutUs.create(payload);
    return newAboutUs;
  }
};

*/
