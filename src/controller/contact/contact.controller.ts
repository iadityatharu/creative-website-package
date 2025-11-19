import { Response } from "express";
import { Contact as ContactService } from "../../service/contact/contact.service";
import { StatusCode } from "../../constant/statusCode.interface";
import { AuthenticatedRequest } from "../../constant/authRequest";
import { IContact } from "../../dto/contact/contact.interface";
import { RecoverDto } from "../../dto/recover.dto";
import { getCache, setCache, deleteCache } from "../../utils/redisClient";

export class Contact {
  private contactService = new ContactService();

  async createContact(
    req: AuthenticatedRequest<{ body: IContact }>,
    res: Response
  ) {
    const result = await this.contactService.createContact(req.body);

    deleteCache("contacts:*").catch(console.error);

    return res.status(result.status).json({
      status: result.status,
      message: "Contact inquiry submitted successfully.",
    });
  }

  async getAllContacts(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const cacheKey = `contacts:${page}:${limit}:${search}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      cached = JSON.parse(cached);
      return res.status(StatusCode.OK).json({
        status: StatusCode.OK,
        data: cached,
        cached: true,
      });
    }

    const result = await this.contactService.getAllContacts(
      page,
      limit,
      search
    );

    await setCache(cacheKey, JSON.stringify(result.data));

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      data: result.data,
      cached: false,
    });
  }

  async getContactById(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const id = req.params.id;
    const cacheKey = `contact:${id}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      cached = JSON.parse(cached);
      return res.status(StatusCode.OK).json({
        status: StatusCode.OK,
        contact: cached,
        cached: true,
      });
    }

    const result = await this.contactService.getContactById(id);
    if (result.status === StatusCode.NOT_FOUND)
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ message: "Contact not found" });

    await setCache(cacheKey, JSON.stringify(result.contact));

    return res.status(StatusCode.OK).json({
      status: result.status,
      contact: result.contact,
      cached: false,
    });
  }

  async deleteContact(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.contactService.deleteContact(ids);

    if (result.status === StatusCode.NOT_FOUND)
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ message: "Contact not found" });

    deleteCache("contacts:*").catch(console.error);
    ids.forEach((id) => deleteCache(`contact:${id}`).catch(console.error));

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: "Contact deleted successfully",
      deletedContactIds: result.deletedContactIds,
    });
  }

  async destroyContacts(
    req: AuthenticatedRequest<{ id: string }>,
    res: Response
  ) {
    const ids = req.params.id.includes(",")
      ? req.params.id.split(",")
      : [req.params.id];
    const result = await this.contactService.hardDeleteContacts(ids);

    if (result.status === StatusCode.NOT_FOUND)
      return res
        .status(StatusCode.NOT_FOUND)
        .json({ message: "Contact not found" });

    deleteCache("contacts:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: result.status,
      message: "Contact permanently deleted",
      deletedContactIds: result.deletedContactIds,
    });
  }

  async getDeletedContacts(req: AuthenticatedRequest, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";

    const result = await this.contactService.getDeletedContacts(
      page,
      limit,
      search
    );

    return res.status(result.status).json({
      status: result.status,
      data: result.data,
    });
  }

  async recoverContacts(req: AuthenticatedRequest, res: Response) {
    const { ids } = req.body as RecoverDto;
    const result = await this.contactService.recoverDeletedContacts(ids);

    if (result.status === StatusCode.BAD_REQUEST)
      return res
        .status(StatusCode.BAD_REQUEST)
        .json({ message: "Provide at least one contact ID to recover" });

    deleteCache("contacts:*").catch(console.error);

    return res.status(StatusCode.OK).json({
      status: StatusCode.OK,
      message: "Contacts recovered successfully",
      recoveredCount: result.recoveredCount,
    });
  }
}
