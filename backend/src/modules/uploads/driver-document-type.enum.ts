export enum DriverDocumentType {
  portrait = 'portrait',
  japanese_certificate = 'japanese_certificate',
  license_front = 'license_front',
  license_back = 'license_back',
  vehicle_photo = 'vehicle_photo',
  registration_paper = 'registration_paper',
  insurance = 'insurance',
}

export const DRIVER_DOCUMENT_SUBDIR: Record<DriverDocumentType, string> = {
  [DriverDocumentType.portrait]: 'drivers/portraits',
  [DriverDocumentType.japanese_certificate]: 'drivers/japanese-certificates',
  [DriverDocumentType.license_front]: 'drivers/licenses',
  [DriverDocumentType.license_back]: 'drivers/licenses',
  [DriverDocumentType.vehicle_photo]: 'drivers/vehicles',
  [DriverDocumentType.registration_paper]: 'drivers/vehicles',
  [DriverDocumentType.insurance]: 'drivers/insurance',
};
