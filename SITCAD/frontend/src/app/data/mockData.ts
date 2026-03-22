// Mock data for the kindergarten LMS
import holdingBook3 from '../../assets/holding_book_3.png';

export interface Student {
  id: string;
  name: string;
  age: number;
  avatar: string;
  classroom: string;
  parentId?: string;
  enrollmentDate: string;
  developmentalStage: 'emerging' | 'developing' | 'proficient' | 'advanced';
  overallProgress: number;
  recentActivity: string;
  needsIntervention?: boolean;
}

export interface Activity {
  id: string;
  studentId: string;
  type: 'literacy' | 'numeracy' | 'social' | 'motor' | 'creative' | 'cognitive';
  title: string;
  description: string;
  date: string;
  duration: number; // minutes
  completed: boolean;
  score?: number;
  feedback?: string;
}

export interface ProgressMetric {
  area: string;
  current: number;
  target: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface DevelopmentalArea {
  name: string;
  category: 'literacy' | 'numeracy' | 'social' | 'motor' | 'creative' | 'cognitive';
  level: number;
  maxLevel: number;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  description: string;
  achieved: boolean;
  achievedDate?: string;
}

export interface Intervention {
  id: string;
  studentId: string;
  studentName: string;
  area: string;
  concern: string;
  priority: 'high' | 'medium' | 'low';
  recommendedActions: string[];
  status: 'pending' | 'in-progress' | 'resolved';
  createdDate: string;
}

export const mockStudents: Student[] = [
  {
    id: 'student1',
    name: 'Little Sprout1',
    age: 5,
    avatar: holdingBook3,
    classroom: 'Class A',
    parentId: 'parent1',
    enrollmentDate: '2025-09-01',
    developmentalStage: 'developing',
    overallProgress: 72,
    recentActivity: 'Letter recognition practice',
    needsIntervention: false,
  },
  {
    id: 'student2',
    name: 'Little Sprout2',
    age: 5,
    avatar: holdingBook3,
    classroom: 'Class A',
    enrollmentDate: '2025-09-01',
    developmentalStage: 'proficient',
    overallProgress: 88,
    recentActivity: 'Counting and sorting',
    needsIntervention: false,
  },
  {
    id: 'student3',
    name: 'Little Sprout3',
    age: 6,
    avatar: holdingBook3,
    classroom: 'Class A',
    enrollmentDate: '2025-09-01',
    developmentalStage: 'emerging',
    overallProgress: 58,
    recentActivity: 'Social interaction games',
    needsIntervention: true,
  },
  {
    id: 'student4',
    name: 'Little Sprout4',
    age: 6,
    avatar: holdingBook3,
    classroom: 'Class A',
    enrollmentDate: '2025-09-01',
    developmentalStage: 'developing',
    overallProgress: 75,
    recentActivity: 'Fine motor skills',
    needsIntervention: false,
  },
  {
    id: 'student5',
    name: 'Little Sprout5',
    age: 6,
    avatar: holdingBook3,
    classroom: 'Class A',
    enrollmentDate: '2025-09-01',
    developmentalStage: 'advanced',
    overallProgress: 95,
    recentActivity: 'Creative storytelling',
    needsIntervention: false,
  },
];

export const mockActivities: Activity[] = [
  {
    id: 'act1',
    studentId: 'student1',
    type: 'literacy',
    title: 'Letter Recognition: A-E',
    description: 'Identify and trace uppercase letters A through E',
    date: '2026-02-19',
    duration: 20,
    completed: true,
    score: 80,
    feedback: 'Good progress! Needs more practice with letter D.',
  },
  {
    id: 'act2',
    studentId: 'student1',
    type: 'numeracy',
    title: 'Counting Objects 1-10',
    description: 'Count and match quantities with numbers',
    date: '2026-02-18',
    duration: 15,
    completed: true,
    score: 90,
    feedback: 'Excellent counting skills!',
  },
  {
    id: 'act3',
    studentId: 'student1',
    type: 'social',
    title: 'Sharing and Turn-Taking',
    description: 'Group activity focusing on cooperation',
    date: '2026-02-17',
    duration: 30,
    completed: true,
    score: 75,
    feedback: 'Shows improvement in sharing with peers.',
  },
  {
    id: 'act4',
    studentId: 'student2',
    type: 'numeracy',
    title: 'Pattern Recognition',
    description: 'Identify and create simple patterns',
    date: '2026-02-19',
    duration: 25,
    completed: true,
    score: 95,
    feedback: 'Outstanding work with complex patterns!',
  },
  {
    id: 'act5',
    studentId: 'student3',
    type: 'motor',
    title: 'Cutting with Scissors',
    description: 'Practice fine motor skills with safe scissors',
    date: '2026-02-19',
    duration: 20,
    completed: true,
    score: 60,
    feedback: 'Needs additional support with hand coordination.',
  },
];

export const mockDevelopmentalAreas: Record<string, DevelopmentalArea[]> = {
  student1: [
    {
      name: 'Reading Readiness',
      category: 'literacy',
      level: 3,
      maxLevel: 5,
      milestones: [
        { id: 'm1', description: 'Recognizes own name in print', achieved: true, achievedDate: '2025-10-15' },
        { id: 'm2', description: 'Identifies 10+ letters', achieved: true, achievedDate: '2025-12-03' },
        { id: 'm3', description: 'Recognizes letter sounds', achieved: false },
        { id: 'm4', description: 'Blends simple words', achieved: false },
      ],
    },
    {
      name: 'Number Sense',
      category: 'numeracy',
      level: 4,
      maxLevel: 5,
      milestones: [
        { id: 'm5', description: 'Counts to 20', achieved: true, achievedDate: '2025-11-20' },
        { id: 'm6', description: 'One-to-one correspondence', achieved: true, achievedDate: '2026-01-10' },
        { id: 'm7', description: 'Simple addition (1-5)', achieved: true, achievedDate: '2026-02-01' },
        { id: 'm8', description: 'Simple subtraction', achieved: false },
      ],
    },
    {
      name: 'Social Skills',
      category: 'social',
      level: 3,
      maxLevel: 5,
      milestones: [
        { id: 'm9', description: 'Takes turns', achieved: true, achievedDate: '2025-10-30' },
        { id: 'm10', description: 'Shares with others', achieved: true, achievedDate: '2025-12-15' },
        { id: 'm11', description: 'Resolves conflicts peacefully', achieved: false },
      ],
    },
    {
      name: 'Fine Motor Skills',
      category: 'motor',
      level: 4,
      maxLevel: 5,
      milestones: [
        { id: 'm12', description: 'Holds pencil correctly', achieved: true, achievedDate: '2025-11-05' },
        { id: 'm13', description: 'Cuts with scissors', achieved: true, achievedDate: '2026-01-20' },
        { id: 'm14', description: 'Draws recognizable shapes', achieved: true, achievedDate: '2026-02-05' },
      ],
    },
  ],
};

export const mockInterventions: Intervention[] = [
  {
    id: 'int1',
    studentId: 'student3',
    studentName: 'Little Sprout3',
    area: 'Fine Motor Skills',
    concern: 'Difficulty with pencil grip and hand-eye coordination',
    priority: 'high',
    recommendedActions: [
      'Daily 10-minute fine motor skill exercises',
      'Use adaptive grip pencils',
      'Playdough and clay activities',
      'Consult with occupational therapist',
    ],
    status: 'in-progress',
    createdDate: '2026-02-10',
  },
  {
    id: 'int2',
    studentId: 'student3',
    studentName: 'Little Sprout3',
    area: 'Social-Emotional',
    concern: 'Shows reluctance in group activities',
    priority: 'medium',
    recommendedActions: [
      'Partner activities before group work',
      'Assign peer buddy',
      'Positive reinforcement for participation',
      'Parent conference scheduled',
    ],
    status: 'in-progress',
    createdDate: '2026-02-05',
  },
];

export function getStudentsByRole(userId: string, role: 'teacher' | 'parent'): Student[] {
  if (role === 'teacher') {
    // Teachers see all students (or students in their classroom)
    return mockStudents;
  } else {
    // Parents see only their children
    return mockStudents.filter(s => s.parentId === userId);
  }
}

export function getStudentById(id: string): Student | undefined {
  return mockStudents.find(s => s.id === id);
}

export function getActivitiesByStudent(studentId: string): Activity[] {
  return mockActivities.filter(a => a.studentId === studentId);
}

export function getDevelopmentalAreas(studentId: string): DevelopmentalArea[] {
  return mockDevelopmentalAreas[studentId] || [];
}

export function getInterventionsByStudent(studentId: string): Intervention[] {
  return mockInterventions.filter(i => i.studentId === studentId);
}

export function getAllInterventions(): Intervention[] {
  return mockInterventions;
}
