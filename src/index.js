import Promise from "bluebird";
import Joi from "joi";
import merge from "lodash.merge";
import { Storage } from "@google-cloud/storage";
import path from "path";
import { pick } from "./utils";

const recursiveReadDir = Promise.promisify(require("recursive-readdir"));

const pluginName = "WebpackGoogleCloudStoragePlugin";

class WebpackGoogleCloudStoragePlugin {
  constructor(options = {}) {
    WebpackGoogleCloudStoragePlugin.validateOptions(options);
    this.isConnected = false;
    this.storageOptions = options.storageOptions;
    this.uploadOptions = options.uploadOptions;
    this.uploadOptions.destinationNameFn =
      this.uploadOptions.destinationNameFn ||
      this.constructor.defaultDestinationNameFn;
    this.uploadOptions.metadataFn =
      this.uploadOptions.metadataFn || this.constructor.defaultMetadataFn;
    this.options = pick(options, [
      "directory",
      "include",
      "exclude",
      "basePath",
    ]);

    // Convert regex patterns to RegExp objects immediately
    this.options.exclude = (this.options.exclude || []).map(
      (pattern) => new RegExp(pattern)
    );
    this.options.include = (this.options.include || []).map(
      (pattern) => new RegExp(pattern)
    );
  }

  static validateOptions(options) {
    const optionsSchema = Joi.object({
      directory: Joi.string(),
      include: Joi.array().items(Joi.string()),
      exclude: Joi.array().items(Joi.string()),
      storageOptions: Joi.object().required(),
      uploadOptions: Joi.object({
        bucketName: Joi.string().required(),
        forceCreateBucket: Joi.boolean(),
        gzip: Joi.boolean(),
        public: Joi.boolean(),
        destinationNameFn: Joi.function(),
        metadataFn: Joi.function(),
        makePublic: Joi.boolean(),
        resumable: Joi.boolean(),
        concurrency: Joi.number(),
      }),
    });

    const { error } = optionsSchema.validate(options);
    if (error) {
      throw new Error(`Configuration validation error: ${error.message}`);
    }
  }

  async connect() {
    if (this.isConnected) return;
    this.client = new Storage(merge(this.storageOptions, { promise: Promise }));
    this.isConnected = true;
  }

  async filterFiles(files) {
    return files.filter(
      (file) =>
        this.isIncluded(file.name) &&
        !this.isExcluded(file.name) &&
        !this.isIgnored(file.name)
    );
  }

  async handleFiles(files) {
    const filteredFiles = await this.filterFiles(files);
    return this.uploadFiles(filteredFiles);
  }

  apply(compiler) {
    this.connect();

    // Utilize Webpack 4's new hooks API
    compiler.hooks.afterEmit.tapAsync(
      pluginName,
      async (compilation, callback) => {
        try {
          const files = await recursiveReadDir(
            this.options.directory,
            this.options.exclude.map(this.constructor.regexpToIgnoreFunction)
          );
          const namedFiles = files.map((f) => ({
            name: path.basename(f),
            path: f,
          }));
          await this.handleFiles(namedFiles);
          callback();
        } catch (error) {
          compilation.errors.push(new Error(`${pluginName}: ${error.stack}`));
          callback();
        }
      }
    );
  }

  async uploadFiles(files = []) {
    const bucket = this.client.bucket(this.uploadOptions.bucketName);
    const uploads = files.map((file) =>
      bucket.upload(file.path, {
        destination: this.uploadOptions.destinationNameFn(file),
        gzip: this.uploadOptions.gzip || false,
        public: this.uploadOptions.makePublic || false,
        resumable: this.uploadOptions.resumable,
        metadata: this.uploadOptions.metadataFn(file),
      })
    );
    return Promise.all(uploads);
  }
}

export default WebpackGoogleCloudStoragePlugin;
