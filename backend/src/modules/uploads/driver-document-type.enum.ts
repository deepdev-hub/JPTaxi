export enum DriverDocumentType {
  portrait = 'portrait',
  license_front = 'license_front',
  license_back = 'license_back',
  vehicle_photo = 'vehicle_photo',
  registration_paper = 'registration_paper',
}

export const DRIVER_DOCUMENT_SUBDIR: Record<DriverDocumentType, string> = {
  [DriverDocumentType.portrait]: 'drivers/portraits',
  [DriverDocumentType.license_front]: 'drivers/licenses',
  [DriverDocumentType.license_back]: 'drivers/licenses',
  [DriverDocumentType.vehicle_photo]: 'drivers/vehicles',
  [DriverDocumentType.registration_paper]: 'drivers/vehicles',
};
