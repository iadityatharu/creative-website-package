import { Response } from "express";
import { Inquiry as InquiryService } from "../../service/inquiry/inquiry.service";
import { StatusCode } from "../../constant/statusCode.interface";
import { expressError } from "../../utils/expressError";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { IInquiry } from "../../dto/inquiry/inquiry.interface";
import { getCache, setCache, deleteCache } from "../../utils/redisClient";
import {
  formatDateTime,
  writeExcelResponse,
  writePdfResponse,
} from "../../utils/exportHelper";
import { RecoverDto } from "../../dto/recover.dto";

export class Inquiry {
  private inquiryService = new InquiryService();

  async createInquiry(
    req: AuthenticatedRequest<{ body: IInquiry }>,
    res: Response
  ) {
    const data: IInquiry = req.body;
    const result = await this.inquiryService.createInquiry(data);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Invalid product reference");

    deleteCache("inquiries:*").catch(console.error);

    return res.status(result.status).json({
      status: result.status,
      message: "Inquiry submitted successfully",
    });
  }

  async getAllInquiries(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const cacheKey = `inquiries:${page}:${limit}:${search}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      cached = JSON.parse(cached);
      return res.status(StatusCode.OK).json({
        status: StatusCode.OK,
        data: cached,
        cached: true,
      });
    }

    const result = await this.inquiryService.getAllInquiries(
      page,
      limit,
      search
    );
    await setCache(cacheKey, JSON.stringify(result.data));

    return res.status(StatusCode.OK).json({
      status: result.status,
      data: result.data,
      cached: false,
    });
  }

  async exportInquiriesToExcel(req: AuthenticatedRequest, res: Response) {
    const search = (req.query.search as string) || "";
    const { page, limit, fields } = this.parseExportRequest(req);
    const inquiries = await this.inquiryService.getInquiriesForExport(
      search,
      page,
      limit,
      fields
    );

    const columns = [
      {
        header: "S.N",
        key: "sn",
        width: 6,
        alignment: { horizontal: "center" as const },
      },
      { header: "Name", key: "name", width: 24 },
      { header: "Email", key: "email", width: 28 },
      {
        header: "Phone",
        key: "phone",
        width: 16,
        alignment: { horizontal: "center" as const },
      },
      { header: "Product", key: "product", width: 26 },
      {
        header: "Handled",
        key: "isHandled",
        width: 12,
        alignment: { horizontal: "center" as const },
      },
      {
        header: "Inquiry Date",
        key: "createdAt",
        width: 20,
        alignment: { horizontal: "center" as const },
      },
    ];

    const rows = this.mapInquiryRows(inquiries);
    await writeExcelResponse(res, "inquiries", columns, rows, "Inquiry Report");
  }

  async exportInquiriesToPdf(req: AuthenticatedRequest, res: Response) {
    const search = (req.query.search as string) || "";
    const { page, limit, fields } = this.parseExportRequest(req);
    const inquiries = await this.inquiryService.getInquiriesForExport(
      search,
      page,
      limit,
      fields
    );

    const columns = [
      { header: "S.N", key: "sn", width: 28 },
      { header: "Name", key: "name" },
      { header: "Email", key: "email" },
      { header: "Phone", key: "phone", width: 73 },
      { header: "Product", key: "product" },
      { header: "Handled", key: "isHandled", width: 45 },
      { header: "Inquiry Date", key: "createdAt", width: 92 },
    ];

    const rows = this.mapInquiryRows(inquiries);
    await writePdfResponse(res, "inquiries", "Inquiry Report", columns, rows);
  }

  async getInquiryById(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const id = req.params.id;
    const result = await this.inquiryService.getInquiryById(id);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Inquiry not found");

    return res.status(StatusCode.OK).json({
      status: result.status,
      inquiry: result.inquiry,
    });
  }

  async updateInquiry(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const id = req.params.id;
    const data: IInquiry = req.body;

    const result = await this.inquiryService.updateInquiry(id, data);
    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Inquiry not found");

    deleteCache("inquiries:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: "Inquiry updated successfully",
    });
  }

  async deleteInquiry(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.inquiryService.deleteInquiry(ids);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Inquiry not found");

    deleteCache("inquiries:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: "Inquiry deleted successfully",
      deletedInquiryIds: result.deletedInquiryIds,
    });
  }

  async getDeletedInquiries(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const result = await this.inquiryService.getDeletedInquiries(
      page,
      limit,
      search
    );

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      data: result.data,
    });
  }

  async recoverInquiries(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;
    const result = await this.inquiryService.recoverDeletedInquiries(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      throw new expressError(
        StatusCode.BAD_REQUEST,
        "Provide at least one inquiry ID to recover."
      );

    deleteCache("inquiries:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Inquiries recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }

  async destroyInquiries(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.inquiryService.hardDeleteInquiries(ids);

    if (result.status === StatusCode.NOT_FOUND)
      throw new expressError(StatusCode.NOT_FOUND, "Inquiry not found");

    deleteCache("inquiries:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Inquiries permanently deleted",
      deletedInquiryIds: result.deletedInquiryIds,
    });
  }

  private parseExportRequest(req: AuthenticatedRequest) {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;

    const fieldsParam = req.query.fields;
    const fields = Array.isArray(fieldsParam)
      ? (fieldsParam as string[])
      : typeof fieldsParam === "string"
      ? fieldsParam.split(",")
      : undefined;

    return { page, limit, fields };
  }

  private mapInquiryRows(rows: any[]) {
    return rows.map((inquiry, index) => {
      const mapped: Record<string, unknown> = { sn: index + 1 };

      const rawIsHandled = (inquiry.isHandled ??
        inquiry.handled ??
        inquiry.is_handled) as boolean | string | undefined;

      Object.entries(inquiry).forEach(([key, value]) => {
        switch (key) {
          case "createdAt":
            mapped.createdAt = formatDateTime(value as any);
            break;
          default:
            mapped[key] = value === undefined || value === "" ? "-" : value;
        }
      });

      mapped.sn = mapped.sn ?? index + 1;

      mapped.isHandled =
        typeof rawIsHandled === "string"
          ? rawIsHandled.toLowerCase() === "true" ||
            rawIsHandled.toLowerCase() === "yes"
            ? "Yes"
            : "No"
          : rawIsHandled
          ? "Yes"
          : "No";

      if (!("createdAt" in mapped)) {
        mapped.createdAt = formatDateTime();
      }

      return mapped;
    });
  }
}
