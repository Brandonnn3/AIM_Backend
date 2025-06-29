import { StatusCodes } from 'http-status-codes';
import ApiError from '../../errors/ApiError';
import { PaginateOptions } from '../../types/paginate';

export class GenericService<T> {
  model: any; // FIXME : fix type ..

  constructor(model: any /** //FIXME : fix type */) {
    this.model = model;
  }

  async create(data: T) {
    return await this.model.create(data);
  }

  async getAll() {
    // pagination er jonno fix korte hobe ..
    return await this.model.find().select('-__v');
  }

  async getAllWithPagination(
    filters: any, // Partial<INotification> // FixMe : fix type
    options: PaginateOptions
  ) {
    const result = await this.model.paginate(filters, options);
    return result;
  }

  async getById(id: string) {
    const object = await this.model.findById(id);
    if (!object) {
      // throw new ApiError(StatusCodes.BAD_REQUEST, 'No file uploaded');
      return null;
    }
    return object;
  }

  async updateById(id: string, data: T) {
    const object = await this.model.findById(id).select('-__v');
    if (!object) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'No Object Found');
      //   return null;
    }

    return await this.model.findByIdAndUpdate(id, data, { new: true }).select('-__v');
  }

  async deleteById(id: string) {
    return await this.model.findByIdAndDelete(id).select('-__v');
  }

  async softDeleteById(id: string) {
    return await this.model.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
  }
}
