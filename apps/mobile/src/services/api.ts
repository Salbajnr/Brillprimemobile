import axios from 'axios';

export class ApiService {
  private baseURL: string;

  constructor(baseURL: string = 'http://0.0.0.0:5000') {
    this.baseURL = baseURL;
  }

  async getHello(): Promise<string> {
    const response = await axios.get(`${this.baseURL}/hello`);
    return response.data;
  }

  async getProducts(): Promise<any[]> {
    const response = await axios.get(`${this.baseURL}/products`);
    return response.data;
  }

  async getProduct(id: string): Promise<any> {
    const response = await axios.get(`${this.baseURL}/products/${id}`);
    return response.data;
  }

  async createProduct(product: any): Promise<any> {
    const response = await axios.post(`${this.baseURL}/products`, product);
    return response.data;
  }

  async updateProduct(id: string, product: any): Promise<any> {
    const response = await axios.put(`${this.baseURL}/products/${id}`, product);
    return response.data;
  }

  async deleteProduct(id: string): Promise<any> {
    const response = await axios.delete(`${this.baseURL}/products/${id}`);
    return response.data;
  }
}