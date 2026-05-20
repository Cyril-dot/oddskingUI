import SportsCategoryBar from '../components/home/SportsCategoryBar';
import HeroCarousel from '../components/home/HeroCarousel';
import LeagueCards from '../components/home/LeagueCards';
import MatchList from '../components/home/MatchList';
import RightSidebar from '../components/home/RightSidebar';

export default function HomePage() {
  return (
    <>
      <div className="flex">
        <div className="flex-1 min-w-0">
          <HeroCarousel />
          <LeagueCards />
          <MatchList />
        </div>
        <RightSidebar />
      </div>
    </>
  );
}