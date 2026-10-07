import { uniqueId } from 'lodash';

import {
  IconAward,
  IconBoxMultiple,
  IconPoint,
  IconBan,
  IconStar,
  IconMoodSmile,
  IconAperture,
  IconUsers,
  IconLockSquare,
  IconBook2,
  IconHelpHexagon,
  IconFilters,
  IconReportSearch,
  IconCategory,
    IconFileText, 
    IconMessage,
  IconCalendarCheck

} from '@tabler/icons-react';

const Menuitems = [
  {
    navlabel: true,
    subheader: 'Home',
  },

  {
    id: uniqueId(),
    title: 'Dashboard',
    icon: IconAperture,
    href: '/',
  },
  {
    id: uniqueId(),
    title: 'Users',
    icon: IconUsers,
    href: '/users',
  },
   {
    id: uniqueId(),
    title: 'Privacy policies',
    icon: IconLockSquare,
    href: '/privacy-policies',
  },
  {
    id: uniqueId(),
    title: 'Terms and Conditions',
    icon: IconBook2,
    href: '/terms-conditions',
  },
  {
    id: uniqueId(),
    title: 'FAQ',
    icon: IconHelpHexagon,
    href: '/faq',
  },
  {
    id: uniqueId(),
    title: 'Interests',
    icon: IconFilters,
    href: '/interests',
  },
  {
    id: uniqueId(),
    title: 'Posts',
    icon: IconReportSearch,
    href: '/posts',
  },
  {
    id: uniqueId(),
    title: 'Categories',
    icon: IconCategory,
    href: '/categories',
  },
   {
    id: uniqueId(),
    title: 'Events',
    icon: IconCalendarCheck,
    href: '/events',
  },
 {
    id: uniqueId(),
    title: 'Blogs',
    icon: IconFileText,
    href: '/blogs',
  }
  ,
 {
    id: uniqueId(),
    title: 'Blog comments',
    icon: IconMessage,
    href: '/blog-comments',
  }
  ,
 {
    id: uniqueId(),
    title: 'Feedback',
    icon: IconPoint,
    href: '/feedback',
  }
  // {
  //   id: uniqueId(),
  //   title: 'Sample ',
  //   icon: IconAperture,
  //   href: '/sample-page',
  // },
  
  // Menu items sidebar items

];

export default Menuitems;
