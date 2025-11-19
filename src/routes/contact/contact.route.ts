import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { authentication } from "../../middleware/authentication";
import { isVerifiedUser } from "../../middleware/isVerifiedUser";
import { isAdmin } from "../../middleware/isAdmin";
import { validateRequest } from "../../middleware/requestValidator";
import { Contact } from "../../controller/contact/contact.controller";
import { ContactDto } from "../../dto/contact/contact.dto";
import { isSudoAdmin } from "../../middleware/isSudoAdmin";
import { RecoverDto } from "../../dto/recover.dto";

const router = Router();
const contact = new Contact();
router.post(
  "/create-contact",
  validateRequest(ContactDto, "body", "create"),
  asyncHandler(contact.createContact.bind(contact))
);

router.get(
  "/get-all-contacts",
  authentication,
  isVerifiedUser,
  asyncHandler(contact.getAllContacts.bind(contact))
);

router.get(
  "/get-contact/:id",
  authentication,
  isVerifiedUser,
  asyncHandler(contact.getContactById.bind(contact))
);

router.delete(
  "/delete-contact/:id",
  authentication,
  isVerifiedUser,
  isAdmin,
  asyncHandler(contact.deleteContact.bind(contact))
);

router.delete(
  "/destroy-contact/:id",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  asyncHandler(contact.destroyContacts.bind(contact))
);

router.get(
  "/deleted-contacts",
  authentication,
  isVerifiedUser,
  asyncHandler(contact.getDeletedContacts.bind(contact))
);

router.put(
  "/recover-contacts",
  authentication,
  isVerifiedUser,
  isSudoAdmin,
  validateRequest(RecoverDto, "body"),
  asyncHandler(contact.recoverContacts.bind(contact))
);

export default router;
