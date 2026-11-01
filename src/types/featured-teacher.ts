export interface FeaturedTeacher {
  id: string;
  name: string;
  slug: string;
  photoUrl?: string | null;
  designation?: string | null;
  subject?: string | null;
  qualification?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  studentsCount?: number | null;
  experienceYears?: number | null;
}

