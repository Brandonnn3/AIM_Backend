import { FilterQuery, Schema } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
// Plugin function for pagination
const paginate = <T>(schema: Schema<T>) => {
  schema.statics.paginate = async function (
    filter: FilterQuery<T>,
    options: PaginateOptions
  ): Promise<PaginateResult<T>> {
    const limit = options.limit ??  Number.MAX_SAFE_INTEGER ; // ?? 10;
    const page = options.page ?? 1;
    const skip = (page - 1) * limit;
    const sort = options.sortBy ?? 'createdAt'; // 🔥 rakib vai er line eita .. 

    // const sort = options.sortBy // chat gpt
    //   ? { [options.sortBy]: options.sortOrder ?? 'asc' }
    //   : { createdAt: 'desc' };

    // chat gpt
    //const sort = options.sortBy ? { [options.sortBy]: -1 } : { createdAt: -1 };  // Sorting in descending order

    const countPromise = this.countDocuments(filter).exec();
    let query = this.find(filter).sort(sort).skip(skip).limit(limit);

    if (options.populate) {
      query = query.populate(options.populate);
    }

    const [totalResults, results] = await Promise.all([
      countPromise,
      query.exec(),
    ]);

    return {
      results,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  };
};

export default paginate;
